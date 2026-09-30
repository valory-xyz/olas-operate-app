import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { FIVE_SECONDS_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { FundingRunService } from '@/service/FundingRun';
import { CreateFundingRunRequest, FundingRun } from '@/types/FundingRun';

/**
 * The middleware's persisted funding run, polled, plus the mutations that
 * drive it. Every mutation writes its returned run straight into the active
 * key so the UI does not wait for the next poll.
 */
export const useFundingRun = () => {
  const queryClient = useQueryClient();

  const activeRunQuery = useQuery<FundingRun | null>({
    queryKey: REACT_QUERY_KEYS.FUNDING_RUN_ACTIVE_KEY,
    queryFn: FundingRunService.getActive,
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });

  const sourcesQuery = useQuery({
    queryKey: REACT_QUERY_KEYS.FUNDING_RUN_SOURCES_KEY,
    queryFn: FundingRunService.getSources,
    staleTime: Infinity,
  });

  const setActiveRun = useCallback(
    (run: FundingRun) =>
      queryClient.setQueryData(REACT_QUERY_KEYS.FUNDING_RUN_ACTIVE_KEY, run),
    [queryClient],
  );

  const invalidateActiveRun = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: REACT_QUERY_KEYS.FUNDING_RUN_ACTIVE_KEY,
      }),
    [queryClient],
  );

  const createMutation = useMutation<
    FundingRun,
    Error,
    CreateFundingRunRequest
  >({
    mutationFn: FundingRunService.create,
    onSuccess: setActiveRun,
    // A 409 means another run is live: refetching surfaces it.
    onError: invalidateActiveRun,
  });

  const refreshQuoteMutation = useMutation<FundingRun, Error, string>({
    mutationFn: (id) => FundingRunService.refreshQuote(id, true),
    onSuccess: setActiveRun,
    onError: invalidateActiveRun,
  });

  const retryMutation = useMutation<FundingRun, Error, string>({
    mutationFn: FundingRunService.retry,
    onSuccess: setActiveRun,
    onError: invalidateActiveRun,
  });

  return {
    activeRun: activeRunQuery.data ?? null,
    isActiveRunFetched: activeRunQuery.isFetched,
    sources: sourcesQuery.data,
    isSourcesLoading: sourcesQuery.isLoading,
    isSourcesError: sourcesQuery.isError,
    refetchSources: sourcesQuery.refetch,
    createMutation,
    refreshQuoteMutation,
    retryMutation,
  };
};
