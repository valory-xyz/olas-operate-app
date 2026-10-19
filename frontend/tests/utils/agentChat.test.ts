import { InfiniteData } from '@tanstack/react-query';

import {
  FeedEntry,
  FeedEventEntry,
  FeedMessageEntry,
  FeedPage,
} from '../../types/AgentChat';
import {
  buildFeedItems,
  chatFailureFromStatus,
  FeedPageParam,
  flattenFeedPages,
  LocalChatMessage,
  mergeIntoNewestPage,
} from '../../utils/agentChat';

const makeEvent = (id: number): FeedEventEntry => ({
  id,
  ts: 1_760_000_000 + id,
  kind: 'event',
  type: 'trade_placed',
  title: 'Placed a trade',
  fields: [],
});

const makeMessage = (
  id: number,
  overrides: Partial<FeedMessageEntry> = {},
): FeedMessageEntry => ({
  id,
  ts: 1_760_000_000 + id,
  kind: 'message',
  role: 'user',
  text: `message ${id}`,
  ...overrides,
});

const makeLocal = (
  overrides: Partial<LocalChatMessage> = {},
): LocalChatMessage => ({
  client_id: 'client-1',
  text: 'Why did you trade?',
  ts: 1_760_000_100,
  state: 'pending',
  ...overrides,
});

const makeInfinite = (
  pages: FeedPage[],
): InfiniteData<FeedPage, FeedPageParam> => ({
  pages,
  pageParams: pages.map((_, index) =>
    index === 0 ? undefined : pages[index - 1].entries[0]?.id,
  ),
});

const ids = (entries: FeedEntry[]) => entries.map(({ id }) => id);

describe('flattenFeedPages', () => {
  it('returns entries oldest first across newest-first pages', () => {
    const data = makeInfinite([
      { entries: [makeEvent(3), makeEvent(4)], has_more: true },
      { entries: [makeEvent(1), makeEvent(2)], has_more: false },
    ]);

    expect(ids(flattenFeedPages(data))).toEqual([1, 2, 3, 4]);
  });

  it('keeps one copy of an entry present in two pages', () => {
    const data = makeInfinite([
      { entries: [makeEvent(2), makeEvent(3)], has_more: true },
      { entries: [makeEvent(1), makeEvent(2)], has_more: false },
    ]);

    expect(ids(flattenFeedPages(data))).toEqual([1, 2, 3]);
  });

  it('returns no entries before the first page loads', () => {
    expect(flattenFeedPages(undefined)).toEqual([]);
  });
});

describe('mergeIntoNewestPage', () => {
  it('adds polled entries to the newest page, merged by id', () => {
    const data = makeInfinite([
      { entries: [makeEvent(3), makeEvent(4)], has_more: true },
      { entries: [makeEvent(1), makeEvent(2)], has_more: false },
    ]);

    const merged = mergeIntoNewestPage(data, {
      entries: [makeEvent(4), makeEvent(5)],
      has_more: true,
    });

    expect(ids(merged!.pages[0].entries)).toEqual([3, 4, 5]);
    expect(merged!.pages[1]).toBe(data.pages[1]);
    expect(merged!.pageParams).toBe(data.pageParams);
  });

  it('keeps the newest page has_more, so paging older still starts from its oldest entry', () => {
    const data = makeInfinite([{ entries: [makeEvent(3)], has_more: true }]);

    const merged = mergeIntoNewestPage(data, {
      entries: [makeEvent(3), makeEvent(4)],
      has_more: true,
    });

    expect(merged!.pages[0].has_more).toBe(true);
  });

  it('restarts from the polled page when entries between the two may be missing', () => {
    const data = makeInfinite([
      { entries: [makeEvent(3), makeEvent(4)], has_more: true },
      { entries: [makeEvent(1), makeEvent(2)], has_more: false },
    ]);
    const polled: FeedPage = {
      entries: [makeEvent(30), makeEvent(31)],
      has_more: true,
    };

    const merged = mergeIntoNewestPage(data, polled);

    expect(merged).toEqual({ pages: [polled], pageParams: [undefined] });
  });

  it('merges a polled page with no older entries even when its ids jump', () => {
    const data = makeInfinite([{ entries: [makeEvent(3)], has_more: false }]);

    const merged = mergeIntoNewestPage(data, {
      entries: [makeEvent(3), makeEvent(30)],
      has_more: false,
    });

    expect(ids(merged!.pages[0].entries)).toEqual([3, 30]);
  });

  it('leaves the cache alone before the first page loads', () => {
    expect(
      mergeIntoNewestPage(undefined, {
        entries: [makeEvent(1)],
        has_more: false,
      }),
    ).toBeUndefined();
  });
});

describe('buildFeedItems', () => {
  it('shows a local message after the feed while it has no polled line', () => {
    const items = buildFeedItems([makeEvent(1)], [makeLocal()]);

    expect(items.map(({ key }) => key)).toEqual(['entry-1', 'local-client-1']);
  });

  it('shows a message once when the poll brings the user line before the reply', () => {
    const polledUserLine = makeMessage(2, {
      text: 'Why did you trade?',
      client_id: 'client-1',
    });

    const items = buildFeedItems([makeEvent(1), polledUserLine], [makeLocal()]);

    expect(items.map(({ key }) => key)).toEqual(['entry-1', 'entry-2']);
  });

  it('keeps the failed state on the polled user line of a failed message', () => {
    const polledUserLine = makeMessage(2, { client_id: 'client-1' });

    const items = buildFeedItems(
      [polledUserLine],
      [makeLocal({ state: 'failed' })],
    );

    expect(items).toEqual([
      { key: 'entry-2', entry: polledUserLine, failure: 'failed' },
    ]);
  });

  it('clears the failed state once a polled agent line answers its client_id', () => {
    const polledUserLine = makeMessage(2, { client_id: 'client-1' });
    const polledReply = makeMessage(3, {
      role: 'agent',
      client_id: 'client-1',
    });

    const items = buildFeedItems(
      [polledUserLine, polledReply],
      [makeLocal({ state: 'failed' })],
    );

    expect(items.map(({ failure }) => failure)).toEqual([undefined, undefined]);
  });

  it('does not take an agent line answering another message as the reply', () => {
    const otherReply = makeMessage(3, { role: 'agent', client_id: 'client-2' });

    const items = buildFeedItems(
      [otherReply],
      [makeLocal({ state: 'failed' })],
    );

    expect(items[1]).toMatchObject({
      key: 'local-client-1',
      failure: 'failed',
    });
  });

  it('marks a message the Agent Wallet could not pay for as no-funds', () => {
    const items = buildFeedItems([], [makeLocal({ state: 'no-funds' })]);

    expect(items[0].failure).toBe('no-funds');
  });

  it('shows no failure while the reply is pending', () => {
    const items = buildFeedItems([], [makeLocal({ state: 'pending' })]);

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
