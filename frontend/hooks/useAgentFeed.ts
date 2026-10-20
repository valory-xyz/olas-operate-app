import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';

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
      const page = await AgentChatService.getAgentFeed(serviceConfigId!, {
        limit: FEED_PAGE_SIZE,
      });
      queryClient.setQueryData<FeedData>(feedKey, (data) =>
        mergeIntoNewestPage(data, page),
      );
      return page;
    },
    enabled: !!serviceConfigId && feed.isSuccess,
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });

  const entries = useMemo(() => flattenFeedPages(feed.data), [feed.data]);

  return {
    entries,
    isLoading: feed.isLoading,
    isError: feed.isError,
    /** The latest poll failed, so newer entries may be missing. */
    isPollError: poll.isError,
    hasOlder: feed.hasNextPage,
    isFetchingOlder: feed.isFetchingNextPage,
    isFetchOlderError: feed.isFetchNextPageError,
    fetchOlder: feed.fetchNextPage,
  };
};
