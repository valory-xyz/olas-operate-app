import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { FIVE_SECONDS_INTERVAL } from '../../constants/intervals';
import { FEED_PAGE_SIZE, useAgentFeed } from '../../hooks/useAgentFeed';
import { AgentChatService } from '../../service/AgentChat';
import { LoadedFeedPage } from '../../types/AgentChat';
import { Maybe } from '../../types/Util';
import { makeFeedEvent } from '../helpers/factories';
import { createTestQueryClient } from '../helpers/queryClient';

jest.mock('../../service/AgentChat', () => ({
  AgentChatService: { getAgentFeed: jest.fn() },
}));

const mockGetAgentFeed = AgentChatService.getAgentFeed as jest.Mock;

const SERVICE_CONFIG_ID = 'sc-1';

const page = (entryIds: number[], hasMore: boolean): LoadedFeedPage => ({
  entries: entryIds.map((id) => makeFeedEvent(id)),
  has_more: hasMore,
  oldestId: entryIds[0],
});

const renderFeedFor = (serviceConfigId: Maybe<string>) => {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(() => useAgentFeed(serviceConfigId), { wrapper });
};

const renderFeed = () => renderFeedFor(SERVICE_CONFIG_ID);

const entryIds = (result: { current: ReturnType<typeof useAgentFeed> }) =>
  result.current.entries.map(({ id }) => id);

describe('useAgentFeed', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetAgentFeed.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads the newest page first', async () => {
    mockGetAgentFeed.mockResolvedValue(page([21, 22], true));

    const { result } = renderFeed();

    await waitFor(() => expect(entryIds(result)).toEqual([21, 22]));
    expect(mockGetAgentFeed).toHaveBeenCalledWith(SERVICE_CONFIG_ID, {
      before: undefined,
      limit: FEED_PAGE_SIZE,
    });
    expect(result.current.hasOlder).toBe(true);
  });

  it('loads older entries before the oldest loaded id', async () => {
    mockGetAgentFeed.mockImplementation(
      async (_id: string, { before }: { before?: number }) =>
        before === 21 ? page([19, 20], false) : page([21, 22], true),
    );
    const { result } = renderFeed();
    await waitFor(() => expect(entryIds(result)).toEqual([21, 22]));

    await act(async () => {
      await result.current.fetchOlder();
    });

    expect(mockGetAgentFeed).toHaveBeenCalledWith(SERVICE_CONFIG_ID, {
      before: 21,
      limit: FEED_PAGE_SIZE,
    });
    await waitFor(() => expect(entryIds(result)).toEqual([19, 20, 21, 22]));
    expect(result.current.hasOlder).toBe(false);
  });

  it('loads older entries before the oldest id sent, even when that line was dropped', async () => {
    mockGetAgentFeed.mockImplementation(
      async (_id: string, { before }: { before?: number }) =>
        before === undefined
          ? { ...page([21, 22], true), oldestId: 19 }
          : page([17, 18], false),
    );
    const { result } = renderFeed();
    await waitFor(() => expect(entryIds(result)).toEqual([21, 22]));

    await act(async () => {
      await result.current.fetchOlder();
    });

    expect(mockGetAgentFeed).toHaveBeenCalledWith(SERVICE_CONFIG_ID, {
      before: 19,
      limit: FEED_PAGE_SIZE,
    });
    await waitFor(() => expect(entryIds(result)).toEqual([17, 18, 21, 22]));
  });

  it('keeps loading older pages when every line of a page was dropped', async () => {
    mockGetAgentFeed.mockImplementation(
      async (_id: string, { before }: { before?: number }) =>
        before === undefined
          ? { entries: [], has_more: true, oldestId: 30 }
          : page([28, 29], false),
    );
    const { result } = renderFeed();
    await waitFor(() => expect(result.current.hasOlder).toBe(true));

    await act(async () => {
      await result.current.fetchOlder();
    });

    await waitFor(() => expect(entryIds(result)).toEqual([28, 29]));
  });

  it('does not fetch without a service', async () => {
    const { result } = renderFeedFor(undefined);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(FIVE_SECONDS_INTERVAL * 2);
    });

    expect(mockGetAgentFeed).not.toHaveBeenCalled();
    expect(result.current.entries).toEqual([]);
  });

  it('keeps the loaded entries and reports it when a poll fails', async () => {
    mockGetAgentFeed
      .mockResolvedValueOnce(page([21, 22], true))
      .mockResolvedValueOnce(page([21, 22, 23], true));
    const { result } = renderFeed();
    await waitFor(() => expect(entryIds(result)).toEqual([21, 22, 23]));
    expect(result.current.isPollError).toBe(false);

    mockGetAgentFeed.mockRejectedValue(new Error('middleware down'));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(FIVE_SECONDS_INTERVAL);
    });

    await waitFor(() => expect(result.current.isPollError).toBe(true));
    expect(entryIds(result)).toEqual([21, 22, 23]);
    expect(result.current.isError).toBe(false);
  });

  it('polls the newest page and merges new entries by id', async () => {
    mockGetAgentFeed
      .mockResolvedValueOnce(page([21, 22], true))
      .mockResolvedValue(page([21, 22, 23], true));
    const { result } = renderFeed();

    await waitFor(() => expect(entryIds(result)).toEqual([21, 22, 23]));

    mockGetAgentFeed.mockResolvedValue(page([22, 23, 24], true));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(FIVE_SECONDS_INTERVAL);
    });

    expect(entryIds(result)).toEqual([21, 22, 23, 24]);
  });

  it('retries a failed first load and then starts polling', async () => {
    mockGetAgentFeed.mockRejectedValueOnce(new Error('feed down'));
    const { result } = renderFeed();
    await waitFor(() => expect(result.current.isError).toBe(true));

    mockGetAgentFeed
      .mockResolvedValueOnce(page([21, 22], true))
      .mockResolvedValue(page([21, 22, 23], true));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(FIVE_SECONDS_INTERVAL);
    });

    await waitFor(() => expect(entryIds(result)).toEqual([21, 22, 23]));
    expect(result.current.isError).toBe(false);
  });

  it('does not reload loaded pages when an older page fails', async () => {
    mockGetAgentFeed.mockImplementation(
      async (_id: string, { before }: { before?: number }) => {
        if (before === 21) throw new Error('older down');
        return page([21, 22], true);
      },
    );
    const { result } = renderFeed();
    await waitFor(() => expect(entryIds(result)).toEqual([21, 22]));

    await act(async () => {
      await result.current.fetchOlder();
    });
    await waitFor(() => expect(result.current.isFetchOlderError).toBe(true));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(FIVE_SECONDS_INTERVAL * 2);
    });

    expect(result.current.isFetchOlderError).toBe(true);
    expect(
      mockGetAgentFeed.mock.calls.filter(([, { before }]) => before === 21),
    ).toHaveLength(1);
  });

  it('keeps entries an earlier poll brought after they leave the newest page', async () => {
    mockGetAgentFeed
      .mockResolvedValueOnce(page([1, 2], false))
      .mockResolvedValueOnce(page([1, 2, 3], false));
    const { result } = renderFeed();
    await waitFor(() => expect(entryIds(result)).toEqual([1, 2, 3]));

    mockGetAgentFeed.mockResolvedValue(page([3, 4], true));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(FIVE_SECONDS_INTERVAL);
    });

    expect(entryIds(result)).toEqual([1, 2, 3, 4]);
  });
});
