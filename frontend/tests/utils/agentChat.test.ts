import { InfiniteData } from '@tanstack/react-query';

import { FeedEntry, LoadedFeedPage } from '../../types/AgentChat';
import {
  addToNewestPage,
  buildFeedItems,
  chatFailureFromStatus,
  FeedPageParam,
  flattenFeedPages,
  formatFeedDay,
  formatFeedTime,
  mergeIntoNewestPage,
} from '../../utils/agentChat';
import {
  makeFeedAgentMessage,
  makeFeedEvent,
  makeFeedUserMessage,
  makeLocalChatMessage,
} from '../helpers/factories';

const makeInfinite = (
  pages: LoadedFeedPage[],
): InfiniteData<LoadedFeedPage, FeedPageParam> => ({
  pages,
  pageParams: pages.map((_, index) =>
    index === 0 ? undefined : pages[index - 1].entries[0]?.id,
  ),
});

const ids = (entries: FeedEntry[]) => entries.map(({ id }) => id);

describe('flattenFeedPages', () => {
  it('returns entries oldest first across newest-first pages', () => {
    const data = makeInfinite([
      { entries: [makeFeedEvent(3), makeFeedEvent(4)], has_more: true },
      { entries: [makeFeedEvent(1), makeFeedEvent(2)], has_more: false },
    ]);

    expect(ids(flattenFeedPages(data))).toEqual([1, 2, 3, 4]);
  });

  it('keeps one copy of an entry present in two pages', () => {
    const data = makeInfinite([
      { entries: [makeFeedEvent(2), makeFeedEvent(3)], has_more: true },
      { entries: [makeFeedEvent(1), makeFeedEvent(2)], has_more: false },
    ]);

    expect(ids(flattenFeedPages(data))).toEqual([1, 2, 3]);
  });

  it('returns no entries before the first page loads', () => {
    expect(flattenFeedPages(undefined)).toEqual([]);
  });
});

/** A page as `getAgentFeed` returns it, with ids from its entries. */
const fetchedPage = (entryIds: number[], hasMore: boolean): LoadedFeedPage => ({
  entries: entryIds.map((id) => makeFeedEvent(id)),
  has_more: hasMore,
  oldestId: entryIds[0],
  newestId: entryIds.at(-1),
});

describe('addToNewestPage', () => {
  it('adds entries to the newest page without moving its fetched position', () => {
    const data = makeInfinite([fetchedPage([81, 100], true)]);

    const added = addToNewestPage(data, [
      makeFeedUserMessage(101),
      makeFeedAgentMessage(126),
    ]);

    expect(ids(added!.pages[0].entries)).toEqual([81, 100, 101, 126]);
    expect(added!.pages[0].newestId).toBe(100);
  });

  it('leaves the cache alone before the first page loads', () => {
    expect(addToNewestPage(undefined, [makeFeedEvent(1)])).toBeUndefined();
  });
});

describe('mergeIntoNewestPage', () => {
  it('adds polled entries to the newest page, merged by id', () => {
    const data = makeInfinite([
      fetchedPage([3, 4], true),
      fetchedPage([1, 2], false),
    ]);

    const merged = mergeIntoNewestPage(data, fetchedPage([4, 5], true));

    expect(ids(merged!.pages[0].entries)).toEqual([3, 4, 5]);
    expect(merged!.pages[0].newestId).toBe(5);
    expect(merged!.pages[1]).toBe(data.pages[1]);
    expect(merged!.pageParams).toBe(data.pageParams);
  });

  it('keeps the newest page has_more and oldestId, so paging older still starts from it', () => {
    const data = makeInfinite([fetchedPage([3], true)]);

    const merged = mergeIntoNewestPage(data, fetchedPage([3, 4], true));

    expect(merged!.pages[0]).toMatchObject({ has_more: true, oldestId: 3 });
  });

  it('keeps loaded history and its fetched position when entries between may be missing', () => {
    const data = makeInfinite([
      fetchedPage([81, 100], true),
      fetchedPage([61, 80], true),
    ]);

    const merged = mergeIntoNewestPage(data, fetchedPage([106, 125], true));

    expect(ids(flattenFeedPages(merged))).toEqual([61, 80, 81, 100, 106, 125]);
    expect(merged!.pages[0].newestId).toBe(100);
    expect(merged!.pageParams).toBe(data.pageParams);
  });

  it('does not count chat entries as fetched when the next poll leaves a gap', () => {
    const data = addToNewestPage(makeInfinite([fetchedPage([81, 100], true)]), [
      makeFeedUserMessage(101),
      makeFeedAgentMessage(126),
    ]);

    const merged = mergeIntoNewestPage(data, fetchedPage([107, 126], true));

    expect(merged!.pages[0].newestId).toBe(100);
  });

  it('advances the fetched position over a polled page with no older entries even when its ids jump', () => {
    const data = makeInfinite([fetchedPage([3], false)]);

    const merged = mergeIntoNewestPage(data, fetchedPage([3, 30], false));

    expect(ids(merged!.pages[0].entries)).toEqual([3, 30]);
    expect(merged!.pages[0].newestId).toBe(30);
  });

  it('starts from the polled page when the feed was empty when loaded', () => {
    const data = makeInfinite([{ entries: [], has_more: false }]);
    const polled = fetchedPage([30, 31], true);

    const merged = mergeIntoNewestPage(data, polled);

    expect(merged).toEqual({ pages: [polled], pageParams: [undefined] });
  });

  it('keeps a chat reply added to a feed that was empty when loaded', () => {
    const data = addToNewestPage(
      makeInfinite([{ entries: [], has_more: false }]),
      [makeFeedUserMessage(40), makeFeedAgentMessage(41)],
    );

    const merged = mergeIntoNewestPage(data, fetchedPage([30, 31], true));

    expect(ids(flattenFeedPages(merged))).toEqual([30, 31, 40, 41]);
    expect(merged!.pages[0]).toMatchObject({
      has_more: true,
      oldestId: 30,
      newestId: 31,
    });
  });

  it('leaves the cache alone before the first page loads', () => {
    expect(
      mergeIntoNewestPage(undefined, fetchedPage([1], false)),
    ).toBeUndefined();
  });
});

describe('buildFeedItems', () => {
  it('shows a local message after the feed while it has no polled line', () => {
    const items = buildFeedItems([makeFeedEvent(1)], [makeLocalChatMessage()]);

    expect(items.map(({ key }) => key)).toEqual(['entry-1', 'local-client-1']);
  });

  it('shows a message once when the poll brings the user line before the reply', () => {
    const polledUserLine = makeFeedUserMessage(2);

    const items = buildFeedItems(
      [makeFeedEvent(1), polledUserLine],
      [makeLocalChatMessage()],
    );

    expect(items.map(({ key }) => key)).toEqual(['entry-1', 'entry-2']);
  });

  it('keeps the failed state on the polled user line of a failed message', () => {
    const polledUserLine = makeFeedUserMessage(2);

    const items = buildFeedItems(
      [polledUserLine],
      [makeLocalChatMessage({ state: 'failed' })],
    );

    expect(items).toEqual([
      { key: 'entry-2', entry: polledUserLine, failure: 'failed' },
    ]);
  });

  it('clears the failed state once a polled agent line answers its client_id', () => {
    const polledUserLine = makeFeedUserMessage(2);
    const polledReply = makeFeedAgentMessage(3, { client_id: 'client-1' });

    const items = buildFeedItems(
      [polledUserLine, polledReply],
      [makeLocalChatMessage({ state: 'failed' })],
    );

    expect(items.map(({ failure }) => failure)).toEqual([undefined, undefined]);
  });

  it('does not take an agent line answering another message as the reply', () => {
    const otherReply = makeFeedAgentMessage(3, { client_id: 'client-2' });

    const items = buildFeedItems(
      [otherReply],
      [makeLocalChatMessage({ state: 'failed' })],
    );

    expect(items[1]).toMatchObject({
      key: 'local-client-1',
      failure: 'failed',
    });
  });

  it('shows a message answered before the feed loaded without a failure', () => {
    const items = buildFeedItems([], [makeLocalChatMessage({ state: 'sent' })]);

    expect(items).toEqual([expect.objectContaining({ key: 'local-client-1' })]);
    expect(items[0]).not.toHaveProperty('failure');
  });

  it('marks a message the Agent Wallet could not pay for as no-funds', () => {
    const items = buildFeedItems(
      [],
      [makeLocalChatMessage({ state: 'no-funds' })],
    );

    expect(items[0].failure).toBe('no-funds');
  });

  it('shows no failure while the reply is pending', () => {
    const items = buildFeedItems(
      [],
      [makeLocalChatMessage({ state: 'pending' })],
    );

    expect(items[0].failure).toBeUndefined();
  });
});

describe('chatFailureFromStatus', () => {
  it.each([
    [402, 'no-funds'],
    [409, 'busy'],
    [400, 'failed'],
    [429, 'failed'],
    [500, 'failed'],
    [503, 'failed'],
    [504, 'failed'],
    [undefined, 'failed'],
  ] as const)('maps %s to %s', (status, failure) => {
    expect(chatFailureFromStatus(status)).toBe(failure);
  });
});

describe('formatFeedDay', () => {
  const now = new Date(2026, 9, 19, 9, 30).getTime();
  const toUnix = (date: Date) => Math.floor(date.getTime() / 1000);

  it.each([
    [new Date(2026, 9, 19, 0, 0), 'Today'],
    [new Date(2026, 9, 18, 23, 59), 'Yesterday'],
    [new Date(2026, 9, 18, 0, 0), 'Yesterday'],
    [new Date(2026, 9, 17, 23, 59), '17 Oct 2026'],
  ])('labels %s as %s', (date, label) => {
    expect(formatFeedDay(toUnix(date), now)).toBe(label);
  });
});

describe('formatFeedTime', () => {
  it('shows the local 24-hour time', () => {
    const ts = Math.floor(new Date(2026, 9, 19, 14, 5).getTime() / 1000);
    expect(formatFeedTime(ts)).toBe('14:05');
  });
});
