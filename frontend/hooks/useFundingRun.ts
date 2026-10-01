import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

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

  // A create cancels the old run before it responds, so a poll landing in
  // between would briefly show no run. Polling pauses while a create is in
  // flight; the old run stays in the cache until the new one replaces it.
  const isCreating =
    useIsMutating({ mutationKey: REACT_QUERY_KEYS.FUNDING_RUN_CREATE_KEY }) > 0;

  const activeRunQuery = useQuery<FundingRun | null>({
    queryKey: REACT_QUERY_KEYS.FUNDING_RUN_ACTIVE_KEY,
    queryFn: FundingRunService.getActive,
    refetchInterval: isCreating ? false : FIVE_SECONDS_INTERVAL,
  });

  const sourcesQuery = useQuery({
    queryKey: REACT_QUERY_KEYS.FUNDING_RUN_SOURCES_KEY,
    queryFn: FundingRunService.getSources,
    staleTime: Infinity,
  });

  const cancelActiveRunPoll = () =>
    queryClient.cancelQueries({
      queryKey: REACT_QUERY_KEYS.FUNDING_RUN_ACTIVE_KEY,
    });

  // Cancel any in-flight poll first, so its older response cannot overwrite
  // the run a mutation just returned.
  const setActiveRun = async (run: FundingRun) => {
    await cancelActiveRunPoll();
    queryClient.setQueryData(REACT_QUERY_KEYS.FUNDING_RUN_ACTIVE_KEY, run);
  };

  const invalidateActiveRun = () =>
    queryClient.invalidateQueries({
      queryKey: REACT_QUERY_KEYS.FUNDING_RUN_ACTIVE_KEY,
    });

  const createMutation = useMutation<
    FundingRun,
    Error,
    CreateFundingRunRequest
  >({
    mutationKey: REACT_QUERY_KEYS.FUNDING_RUN_CREATE_KEY,
    mutationFn: FundingRunService.create,
    // A poll already in flight could still land after the old run is cancelled.
    onMutate: cancelActiveRunPoll,
    onSuccess: setActiveRun,
    // A 409 means another run is live: refetching surfaces it.
    onError: invalidateActiveRun,
  });

  const refreshQuoteMutation = useMutation<FundingRun, Error, string>({
    mutationFn: FundingRunService.refreshQuote,
    onSuccess: setActiveRun,
    onError: invalidateActiveRun,
  });

  const retryMutation = useMutation<FundingRun, Error, string>({
    mutationFn: FundingRunService.retry,
    onSuccess: setActiveRun,
    onError: invalidateActiveRun,
  });

  const cancelMutation = useMutation<FundingRun, Error, string>({
    mutationFn: FundingRunService.cancel,
    onSuccess: setActiveRun,
    onError: invalidateActiveRun,
  });

  return {
    activeRun: activeRunQuery.data ?? null,
    isActiveRunFetched: activeRunQuery.isFetched,
    isActiveRunError: activeRunQuery.isError,
    refetchActiveRun: activeRunQuery.refetch,
    sources: sourcesQuery.data,
    isSourcesLoading: sourcesQuery.isLoading,
    isSourcesError: sourcesQuery.isError,
    refetchSources: sourcesQuery.refetch,
    createMutation,
    refreshQuoteMutation,
    retryMutation,
    cancelMutation,
  };
};
