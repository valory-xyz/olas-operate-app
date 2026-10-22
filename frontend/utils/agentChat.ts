import { InfiniteData } from '@tanstack/react-query';
import dayjs from 'dayjs';

import {
  FeedAgentMessageEntry,
  FeedEntry,
  FeedEventEntry,
  FeedUserMessageEntry,
  LoadedFeedPage,
} from '@/types/AgentChat';

/** `before` cursor of a feed page; `undefined` for the newest page. */
export type FeedPageParam = number | undefined;

export type FeedData = InfiniteData<LoadedFeedPage, FeedPageParam>;

/** Why a sent message has no reply. Session-only: the agent writes no failures. */
export type ChatFailure = 'failed' | 'no-funds';

/** A message sent from this session, keyed by the `client_id` Pearl generated. */
export type LocalChatMessage = {
  client_id: string;
  text: string;
  /** Unix seconds, shown on the message. */
  ts: number;
  /** Milliseconds; when the current request for it started. */
  sentAt: number;
  /** `sent`: answered before the feed loaded, so the feed doesn't show it yet. */
  state: 'pending' | 'sent' | ChatFailure;
};

export type FeedItem =
  | {
      key: string;
      entry: FeedEventEntry | FeedAgentMessageEntry;
      failure?: never;
    }
  | {
      key: string;
      entry: FeedUserMessageEntry | Omit<FeedUserMessageEntry, 'id'>;
      failure?: ChatFailure;
    };

const byId = (entries: FeedEntry[]) =>
  [...new Map(entries.map((entry) => [entry.id, entry])).values()].sort(
    (a, b) => a.id - b.id,
  );

/** All loaded entries, oldest first, one per id. */
export const flattenFeedPages = (data: FeedData | undefined): FeedEntry[] =>
  byId(data?.pages.flatMap((page) => page.entries) ?? []);

/**
 * Adds entries the feed didn't fetch, e.g. a chat reply, to the newest page.
 * Its `newestId` stays, so polls still fetch everything after it.
 */
export const addToNewestPage = (
  data: FeedData | undefined,
  entries: FeedEntry[],
): FeedData | undefined => {
  if (!data || data.pages.length === 0) return data;

  const [newest, ...older] = data.pages;
  return {
    ...data,
    pages: [
      { ...newest, entries: byId([...newest.entries, ...entries]) },
      ...older,
    ],
  };
};

/**
 * Merges freshly polled newest entries into the cached feed, keeping loaded
 * history. `newestId` only advances when they reach back to it, so entries
 * still missing in between are fetched by the next poll.
 */
export const mergeIntoNewestPage = (
  data: FeedData | undefined,
  polled: LoadedFeedPage,
): FeedData | undefined => {
  if (!data || data.pages.length === 0) return data;

  const [newest] = data.pages;
  const fetchedUpTo = newest.newestId;
  // The feed was empty when loaded: the polled page takes over paging, keeping
  // only entries added since, e.g. a chat reply.
  if (fetchedUpTo === undefined) {
    return {
      pages: [
        { ...polled, entries: byId([...newest.entries, ...polled.entries]) },
      ],
      pageParams: [undefined],
    };
  }

  const merged = addToNewestPage(data, polled.entries)!;
  const reachesFetched =
    !polled.has_more ||
    (polled.oldestId !== undefined && polled.oldestId <= fetchedUpTo);
  if (!reachesFetched) return merged;

  const [mergedNewest, ...older] = merged.pages;
  return {
    ...merged,
    pages: [
      {
        ...mergedNewest,
        newestId: Math.max(fetchedUpTo, polled.newestId ?? fetchedUpTo),
      },
      ...older,
    ],
  };
};

/**
 * Feed entries plus this session's messages, in display order.
 *
 * A local message is replaced by the polled user line with its `client_id`,
 * whichever arrives first, so it shows once. Its failure stays on that line
 * until an agent line answering the same `client_id` arrives.
 */
export const buildFeedItems = (
  entries: FeedEntry[],
  localMessages: LocalChatMessage[],
): FeedItem[] => {
  const polledUserIds = new Set<string>();
  const answeredIds = new Set<string>();
  entries.forEach((entry) => {
    if (entry.kind !== 'message' || !entry.client_id) return;
    (entry.role === 'user' ? polledUserIds : answeredIds).add(entry.client_id);
  });

  const failureOf = (clientId: string) => {
    if (answeredIds.has(clientId)) return undefined;
    const state = localMessages.find(
      (message) => message.client_id === clientId,
    )?.state;
    return state === 'pending' || state === 'sent' ? undefined : state;
  };

  const feedItems = entries.map((entry): FeedItem => {
    const key = `entry-${entry.id}`;
    if (entry.kind === 'event' || entry.role === 'agent') return { key, entry };
    const failure = failureOf(entry.client_id);
    return { key, entry, ...(failure && { failure }) };
  });

  const localItems = localMessages
    .filter(({ client_id }) => !polledUserIds.has(client_id))
    .map(({ client_id, text, ts }): FeedItem => {
      const failure = failureOf(client_id);
      return {
        key: `local-${client_id}`,
        entry: { kind: 'message', role: 'user', text, ts, client_id },
        ...(failure && { failure }),
      };
    });

  return [...feedItems, ...localItems];
};

/** How a failed chat request shows in the UI, by HTTP status. */
export const chatFailureFromStatus = (
  status: number | undefined,
): ChatFailure | 'busy' => {
  if (status === 402) return 'no-funds';
  if (status === 409) return 'busy';
  return 'failed';
};

/** "Today", "Yesterday" or e.g. "12 Oct 2026", in local time. */
export const formatFeedDay = (ts: number, now: number = Date.now()) => {
  const day = dayjs.unix(ts).startOf('day');
  const today = dayjs(now).startOf('day');
  if (day.isSame(today)) return 'Today';
  if (day.isSame(today.subtract(1, 'day'))) return 'Yesterday';
  return day.format('D MMM YYYY');
};

/** e.g. "14:25", in local time. */
export const formatFeedTime = (ts: number) => dayjs.unix(ts).format('HH:mm');
