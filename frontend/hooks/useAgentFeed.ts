import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { FIVE_SECONDS_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { AgentChatService } from '@/service/AgentChat';
import { LoadedFeedPage } from '@/types/AgentChat';
import { Maybe } from '@/types/Util';
import {
  FeedData,
  FeedPageParam,
  flattenFeedPages,
  mergeIntoNewestPage,
} from '@/utils/agentChat';

export const FEED_PAGE_SIZE = 20;

/**
 * The newest entries, paging back until they reach `fetchedUpTo` so none in
 * between are skipped.
 */
const fetchNewestSince = async (
  serviceConfigId: string,
  fetchedUpTo: number | undefined,
): Promise<LoadedFeedPage> => {
  const newest = await AgentChatService.getAgentFeed(serviceConfigId, {
    limit: FEED_PAGE_SIZE,
  });
  const entries = [...newest.entries];
  let oldest = newest;
  while (
    fetchedUpTo !== undefined &&
    oldest.has_more &&
    oldest.oldestId !== undefined &&
    oldest.oldestId > fetchedUpTo
  ) {
    const before: number = oldest.oldestId;
    oldest = await AgentChatService.getAgentFeed(serviceConfigId, {
      before,
      limit: FEED_PAGE_SIZE,
    });
    entries.push(...oldest.entries);
    // A page not below `before` would never reach `fetchedUpTo`.
    if (oldest.oldestId === undefined || oldest.oldestId >= before) break;
  }
  return { ...oldest, entries, newestId: newest.newestId };
};

/**
 * The agent's feed, served by the middleware whether the agent runs or not.
 * Older pages load on demand; the newest page is polled and merged by id.
 */
export const useAgentFeed = (serviceConfigId: Maybe<string>) => {
  const queryClient = useQueryClient();
  const feedKey = REACT_QUERY_KEYS.AGENT_FEED_KEY(serviceConfigId);

  const feed = useInfiniteQuery<
    LoadedFeedPage,
    Error,
    FeedData,
    typeof feedKey,
    FeedPageParam
  >({
    queryKey: feedKey,
    queryFn: ({ pageParam }) =>
      AgentChatService.getAgentFeed(serviceConfigId!, {
        before: pageParam,
        limit: FEED_PAGE_SIZE,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.oldestId : undefined,
    enabled: !!serviceConfigId,
    // Kept fresh by the poll below; refetching would reload every page.
    staleTime: Infinity,
    // The poll waits for a first page, so a failed first load retries here.
    refetchInterval: ({ state }) =>
      state.status === 'error' && !state.data ? FIVE_SECONDS_INTERVAL : false,
  });

  const poll = useQuery({
    queryKey: REACT_QUERY_KEYS.AGENT_FEED_LATEST_KEY(serviceConfigId),
    queryFn: async () => {
      const fetchedUpTo =
        queryClient.getQueryData<FeedData>(feedKey)?.pages[0]?.newestId;
      const page = await fetchNewestSince(serviceConfigId!, fetchedUpTo);
      queryClient.setQueryData<FeedData>(feedKey, (data) =>
        mergeIntoNewestPage(data, page),
      );
      return page;
    },
    // Not `feed.isSuccess`: a failed older page sets it false with data loaded.
    enabled: !!serviceConfigId && !!feed.data,
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });

  // Tracked here, not read from the query: each poll's merge clears its error.
  const [olderErrorFor, setOlderErrorFor] = useState<Maybe<string>>();
  const { fetchNextPage } = feed;
  const fetchOlder = useCallback(async () => {
    const { isFetchNextPageError } = await fetchNextPage();
    setOlderErrorFor(isFetchNextPageError ? serviceConfigId : undefined);
  }, [fetchNextPage, serviceConfigId]);

  const entries = useMemo(() => flattenFeedPages(feed.data), [feed.data]);

  return {
    entries,
    isLoading: feed.isLoading,
    isError: feed.isError,
    /** Newer entries may be missing. */
    isPollError: poll.isError,
    hasOlder: feed.hasNextPage,
    isFetchingOlder: feed.isFetchingNextPage,
    isFetchOlderError: !!serviceConfigId && olderErrorFor === serviceConfigId,
    fetchOlder,
  };
};
