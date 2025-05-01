import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { TokenSymbol } from '@/enums/Token';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';
import { BridgeService } from '@/service/Bridge';
import { BridgeStatusResponse, BridgingStepStatus } from '@/types/Bridge';

const isBridgingFailedFn = (
  requests: BridgeStatusResponse['bridge_request_status'] = [],
) =>
  requests
    ? requests.some((step) => step.status === 'EXECUTION_FAILED')
    : false;

const isBridgingCompletedFn = (
  requests: BridgeStatusResponse['bridge_request_status'] = [],
) => requests.every((step) => step.status === 'EXECUTION_DONE');

const getBridgeStats = ({
  stats,
  tokenSymbols,
}: {
  hasAnyBridgeFailed?: boolean;
  tokenSymbols: TokenSymbol[];
  stats: BridgeStatusResponse['bridge_request_status'];
}) =>
  stats.map((step, index) => {
    const stepStatus: BridgingStepStatus = (() => {
      if (step.status === 'EXECUTION_DONE') return 'finish';
      if (step.status === 'EXECUTION_FAILED') return 'error';
      if (step.status === 'EXECUTION_PENDING') return 'process';
      return 'process';
    })();

    return {
      symbol: tokenSymbols[index],
      status: stepStatus,
      txnLink: step.explorer_link,
    };
  });

// hook to fetch bridging steps (step 1)
export const useBridgingSteps = (
  quoteId: string,
  tokenSymbols: TokenSymbol[],
) => {
  const { isOnline } = useOnlineStatusContext();

  // `/execute` bridge API should be called first before fetching the status.
  const {
    isLoading: isBridgeExecuteLoading,
    isFetching: isBridgeExecuteFetching,
    isError: isBridgeExecuteError,
    data: bridgeExecuteData,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.BRIDGE_EXECUTE_KEY(quoteId),
    queryFn: async () => {
      try {
        return await BridgeService.executeBridge(quoteId);
      } catch (error) {
        console.error('Error executing bridge', error);
        throw error;
      }
    },
    enabled: !!quoteId && isOnline,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const isBridgingExecuteFailed = isBridgingFailedFn(
    bridgeExecuteData?.bridge_request_status,
  );
  const isBridgingExecuteCompleted = isBridgingCompletedFn(
    bridgeExecuteData?.bridge_request_status,
  );

  const {
    isLoading: isBridgeStatusLoading,
    isError: isBridgeStatusError,
    data: bridgeStatusData,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.BRIDGE_STATUS_BY_QUOTE_ID_KEY(quoteId),
    queryFn: async ({ signal }) => {
      try {
        return await BridgeService.getBridgeStatus(quoteId, signal);
      } catch (error) {
        console.error('Error fetching bridge status', error);
        throw error;
      }
    },
    // fetch by interval until the status is FINISHED
    refetchInterval:
      isBridgingExecuteFailed || isBridgingExecuteCompleted
        ? false
        : FIVE_SECONDS_INTERVAL,
    enabled: !!quoteId && isOnline && !!bridgeExecuteData,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isBridging = useMemo(() => {
    if (isBridgeExecuteLoading) return true;
    if (isBridgeStatusLoading) return true;
    return false;
  }, [isBridgeExecuteLoading, isBridgeStatusLoading]);

  const isBridgingCompleted = useMemo(() => {
    // If the bridge execute itself has EXECUTION_DONE, we can consider the bridging as completed.
    // and we don't need to check the status.
    if (isBridgingExecuteCompleted) return true;

    return isBridgingCompletedFn(bridgeStatusData?.bridge_request_status);
  }, [isBridgingExecuteCompleted, bridgeStatusData]);

  const hasAnyBridgeFailed = useMemo(
    () =>
      isBridgingExecuteFailed ||
      isBridgingFailedFn(bridgeStatusData?.bridge_request_status),
    [isBridgingExecuteFailed, bridgeStatusData],
  );

  // if the bridge status is 'EXECUTION_FAILED' or 'EXECUTION_PENDING'
  // and the API has error, we can consider the bridging as failed.
  const isBridgingFailed = useMemo(() => {
    if (isBridgeExecuteError) return true;
    if (isBridgeStatusError) return true;
    if (hasAnyBridgeFailed) return true;
    return false;
  }, [isBridgeExecuteError, isBridgeStatusError, hasAnyBridgeFailed]);

  const executeBridgeSteps = useMemo(() => {
    if (isBridgeExecuteLoading) return;
    if (isBridgeExecuteFetching) return;
    if (isBridgeExecuteError) return;
    if (!bridgeExecuteData) return;

    return getBridgeStats({
      stats: bridgeExecuteData.bridge_request_status,
      tokenSymbols,
    });
  }, [
    isBridgeExecuteLoading,
    isBridgeExecuteFetching,
    isBridgeExecuteError,
    bridgeExecuteData,
    tokenSymbols,
  ]);

  const statusBridgeSteps = useMemo(() => {
    if (isBridgeStatusLoading) return;
    if (isBridgeStatusError) return;
    if (!bridgeStatusData) return;

    return getBridgeStats({
      stats: bridgeStatusData.bridge_request_status,
      tokenSymbols,
    });
  }, [
    isBridgeStatusLoading,
    isBridgeStatusError,
    bridgeStatusData,
    tokenSymbols,
  ]);

  const bridgeStatus = useMemo(() => {
    if (isBridgingExecuteCompleted) return executeBridgeSteps;
    return statusBridgeSteps;
  }, [isBridgingExecuteCompleted, executeBridgeSteps, statusBridgeSteps]);

  return {
    isBridging,
    isBridgingFailed,
    isBridgingCompleted,
    bridgeStatus,
  };
};
