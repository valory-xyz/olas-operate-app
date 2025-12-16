import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { TokenSymbol } from '@/config/tokens';
import { FIVE_SECONDS_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';
import { BridgeService } from '@/service/Bridge';
import {
  BridgeStatuses,
  BridgeStatusResponse,
  BridgingStepStatus,
} from '@/types/Bridge';
import { Nullable } from '@/types/Util';
import { delayInSeconds } from '@/utils/delay';

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
}): BridgeStatuses =>
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

/**
 * Hook to fetch bridging steps
 */
export const useBridgingSteps = (
  tokenSymbols: TokenSymbol[],
  quoteId?: Nullable<string>,
) => {
  const { isOnline } = useOnlineStatusContext();

  // `/execute` bridge API should be called first before fetching the status.
  const {
    isLoading: isBridgeExecuteLoading,
    isFetching: isBridgeExecuteFetching,
    isError: isBridgeExecuteError,
    data: bridgeExecuteData,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.BRIDGE_EXECUTE_KEY(quoteId!),
    queryFn: async ({ signal }) => {
      if (!quoteId) {
        window.console.warn('No quoteId provided to execute bridge');
        return;
      }

      await delayInSeconds(1); // minor delay before executing the bridge.

      try {
        return await BridgeService.executeBridge(quoteId, signal);
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

  const isBridgingExecuteFailed = useMemo(() => {
    if (isBridgeExecuteError) return true;
    if (!bridgeExecuteData) return false;
    return isBridgingFailedFn(bridgeExecuteData.bridge_request_status);
  }, [isBridgeExecuteError, bridgeExecuteData]);

  /** Check if the bridging execution is completed for all status */
  const isBridgingExecuteCompleted = useMemo(() => {
    if (!bridgeExecuteData) return false;
    return isBridgingCompletedFn(bridgeExecuteData.bridge_request_status);
  }, [bridgeExecuteData]);

  const {
    isLoading: isBridgeStatusLoading,
    isError: isBridgeStatusError,
    data: bridgeStatusData,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.BRIDGE_STATUS_BY_QUOTE_ID_KEY(quoteId!),
    queryFn: async () => {
      if (!quoteId) {
        window.console.warn('No quoteId provided to fetch bridge status');
        return;
      }

      try {
        return await BridgeService.getBridgeStatus(quoteId);
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
    enabled:
      isOnline &&
      !!quoteId &&
      !isBridgeExecuteFetching &&
      !isBridgeExecuteLoading &&
      !!bridgeExecuteData,
    refetchOnWindowFocus: false,
  });

  const isBridging = isBridgeExecuteLoading || isBridgeStatusLoading;

  const isBridgingCompleted = useMemo(() => {
    // If the bridge execute itself has EXECUTION_DONE, we can consider the bridging as completed.
    // and we don't need to check the status.
    if (isBridgingExecuteCompleted) return true;
    if (!bridgeStatusData) return false;

    return isBridgingCompletedFn(bridgeStatusData.bridge_request_status);
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

  const bridgeStatus: BridgeStatuses | undefined = useMemo(() => {
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
