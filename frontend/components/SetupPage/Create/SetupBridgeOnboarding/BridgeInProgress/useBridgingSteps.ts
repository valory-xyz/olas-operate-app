import { useQuery } from '@tanstack/react-query';

import { StepEvent } from '@/components/bridge/BridgingSteps';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { TokenSymbol } from '@/enums/Token';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';
import { BridgeService } from '@/service/Bridge';
import { BridgingStepStatus } from '@/types/Bridge';

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
    refetch: refetchBridgeExecute,
    data: bridgeExecuteDetails,
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

  const statusQuery = useQuery({
    queryKey: REACT_QUERY_KEYS.BRIDGE_STATUS_BY_QUOTE_ID_KEY(quoteId),
    queryFn: async () => {
      try {
        return await BridgeService.getBridgeStatus(quoteId);
      } catch (error) {
        console.error('Error fetching bridge status', error);
        throw error;
      }
    },
    select: ({ status, bridge_request_status }) => {
      const isBridgingFailed = bridge_request_status.some(
        (step) => step.status === 'EXECUTION_FAILED',
      );
      const isBridgingCompleted = bridge_request_status.every(
        (step) => step.status === 'EXECUTION_DONE',
      );
      return {
        status,
        isBridgingCompleted,
        isBridgingFailed,
        bridgeRequestStatus: bridge_request_status.map((step, index) => {
          const status: BridgingStepStatus = (() => {
            if (step.status === 'EXECUTION_DONE') return 'finish';
            if (step.status === 'EXECUTION_FAILED') return 'error';
            if (step.status === 'EXECUTION_PENDING') return 'process';
            return 'process';
          })();

          return {
            symbol: tokenSymbols[index],
            status,
            txnLink: step.explorer_link,
          };
        }) satisfies StepEvent[],
      };
    },
    // fetch by interval until the status is FINISHED
    refetchInterval: ({ state }) => {
      const isBridgingFailed = state?.data?.bridge_request_status.some(
        (step) => step.status === 'EXECUTION_FAILED',
      );
      const isBridgingCompleted = state?.data?.bridge_request_status.every(
        (step) => step.status === 'EXECUTION_DONE',
      );

      return isBridgingFailed || isBridgingCompleted
        ? false
        : FIVE_SECONDS_INTERVAL;
    },
    enabled: !!quoteId && isOnline && !!bridgeExecuteDetails,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    isBridgeExecuteLoading: isBridgeExecuteFetching || isBridgeExecuteLoading,
    isBridgeExecuteError,
    refetchBridgeExecute,
    ...statusQuery,
  };
};
