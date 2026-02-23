import { ReloadOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { FundsAreSafeMessage } from '@/components/ui/FundsAreSafeMessage';
import { TransactionStep } from '@/components/ui/TransactionSteps';
import { TokenSymbol } from '@/config/tokens';
import { EvmChainId } from '@/constants/chains';
import { useBridgingSteps, useOnRampContext } from '@/hooks';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useBridgeRefillRequirementsOnDemand } from '@/hooks/useBridgeRefillRequirementsOnDemand';
import {
  BridgeRefillRequirementsResponse,
  BridgeStatuses,
} from '@/types/Bridge';
import { delayInSeconds } from '@/utils/delay';

import { useBridgeRequirementsUtils } from '../hooks/useBridgeRequirementsUtils';
import { GetOnRampRequirementsParams } from '../types';

const { Text } = Typography;

/**
 * Hook to calculate the bridge requirements for the swapping process after on-ramp,
 */
const useBridgeRequirements = (
  onRampChainId: EvmChainId,
  getOnRampRequirementsParams: GetOnRampRequirementsParams,
) => {
  const [bridgeFundingRequirements, setBridgeFundingRequirements] =
    useState<BridgeRefillRequirementsResponse | null>(null);
  const { isOnRampingStepCompleted } = useOnRampContext();
  const { isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();
  const {
    getReceivingTokens,
    getTokensToBeBridged,
    getBridgeParamsExceptNativeToken,
  } = useBridgeRequirementsUtils(onRampChainId);

  // State to control the force update of the bridge_refill_requirements API call
  // This is used when the user clicks on "Try again" button.
  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [
    isBridgeRefillRequirementsApiLoading,
    setIsBridgeRefillRequirementsApiLoading,
  ] = useState(true);
  const [isManuallyRefetching, setIsManuallyRefetching] = useState(false);

  const bridgeParams = useMemo(() => {
    if (!getOnRampRequirementsParams) return null;
    return getOnRampRequirementsParams(isForceUpdate);
  }, [isForceUpdate, getOnRampRequirementsParams]);

  const bridgeParamsExceptNativeToken = useMemo(
    () => getBridgeParamsExceptNativeToken(bridgeParams),
    [getBridgeParamsExceptNativeToken, bridgeParams],
  );

  const {
    isLoading: isBridgeRefillRequirementsLoading,
    isError: isBridgeRefillRequirementsError,
    refetch: refetchBridgeRefillRequirements,
  } = useBridgeRefillRequirementsOnDemand(bridgeParamsExceptNativeToken);

  // fetch bridge refill requirements manually on mount
  useEffect(() => {
    if (!isBridgeRefillRequirementsApiLoading) return;
    if (!isOnRampingStepCompleted) return;

    refetchBridgeRefillRequirements()
      .then(({ data }) => setBridgeFundingRequirements(data ?? null))
      .finally(() => {
        setIsBridgeRefillRequirementsApiLoading(false);
      });
  }, [
    isBridgeRefillRequirementsApiLoading,
    isOnRampingStepCompleted,
    refetchBridgeRefillRequirements,
    setIsBridgeRefillRequirementsApiLoading,
  ]);

  const isLoading =
    isBalancesAndFundingRequirementsLoading ||
    isBridgeRefillRequirementsLoading ||
    isBridgeRefillRequirementsApiLoading ||
    isManuallyRefetching;

  const hasAnyQuoteFailed = useMemo(() => {
    if (!bridgeFundingRequirements) return false;
    return bridgeFundingRequirements.bridge_request_status.some(
      ({ status }) => status === 'QUOTE_FAILED',
    );
  }, [bridgeFundingRequirements]);

  const receivingTokens = useMemo(
    () => getReceivingTokens(bridgeParams),
    [getReceivingTokens, bridgeParams],
  );
  const tokensToBeBridged = useMemo(
    () => getTokensToBeBridged(receivingTokens),
    [getTokensToBeBridged, receivingTokens],
  );

  // Retry to fetch the bridge refill requirements
  const onRetry = useCallback(async () => {
    setIsForceUpdate(true);
    setIsManuallyRefetching(true);

    await delayInSeconds(1); // slight delay before refetching.

    refetchBridgeRefillRequirements()
      .then(({ data }) => {
        setBridgeFundingRequirements(data ?? null);

        // force_update: true is used only when the user clicks on "Try again",
        // hence reset it to false after the API call is made.
        setIsForceUpdate(false);
      })
      .finally(() => {
        setIsManuallyRefetching(false);
      });
  }, [refetchBridgeRefillRequirements]);

  return {
    isLoading,
    hasError: isBridgeRefillRequirementsError || hasAnyQuoteFailed,
    bridgeFundingRequirements,
    receivingTokens,
    tokensToBeBridged,
    onRetry,
  };
};

const TITLE = 'Swap funds';

type SwapFundsStep = {
  tokensToBeTransferred: TokenSymbol[];
  tokensToBeBridged: TokenSymbol[];
  step: TransactionStep;
};

const EMPTY_STATE: SwapFundsStep = {
  tokensToBeTransferred: [],
  tokensToBeBridged: [],
  step: {
    status: 'wait',
    title: TITLE,
    subSteps: [],
  },
};

const PROCESS_STATE: SwapFundsStep = {
  tokensToBeTransferred: [],
  tokensToBeBridged: [],
  step: {
    status: 'process',
    title: TITLE,
    subSteps: [{ description: 'Sending transaction...' }],
  },
};

const getQuoteFailedErrorState = (onRetry: () => void): SwapFundsStep => ({
  tokensToBeTransferred: [],
  tokensToBeBridged: [],
  step: {
    status: 'error',
    title: TITLE,
    subSteps: [
      {
        failed: (
          <Flex vertical gap={8} align="flex-start">
            <Text className="text-sm text-lighter">Quote request failed</Text>
            <Button onClick={onRetry} icon={<ReloadOutlined />} size="small">
              Try again
            </Button>
          </Flex>
        ),
      },
    ],
  },
});

/**
 * Hook to manage the swap funds step in the on-ramping process.
 */
export const useSwapFundsStep = (
  onRampChainId: EvmChainId,
  getOnRampRequirementsParams: GetOnRampRequirementsParams,
): SwapFundsStep => {
  const {
    isOnRampingStepCompleted,
    isSwappingFundsStepCompleted,
    updateIsSwappingStepCompleted,
  } = useOnRampContext();
  const {
    isLoading,
    hasError,
    bridgeFundingRequirements,
    receivingTokens,
    tokensToBeBridged,
    onRetry,
  } = useBridgeRequirements(onRampChainId, getOnRampRequirementsParams);

  // State to hold the steps for the swap funds process
  const [swapFundsSteps, setSwapFundsSteps] = useState<BridgeStatuses>();

  // If the on-ramping is not completed, we do not proceed with the swap step.
  const quoteId = useMemo(() => {
    if (isLoading) return;
    if (!isOnRampingStepCompleted) return;
    if (!bridgeFundingRequirements) return;
    return bridgeFundingRequirements.id;
  }, [isLoading, isOnRampingStepCompleted, bridgeFundingRequirements]);

  const { isBridgingCompleted, isBridgingFailed, isBridging, bridgeStatus } =
    useBridgingSteps(tokensToBeBridged, quoteId);

  // If the swap step is already completed, we do not swap funds again
  useEffect(() => {
    if (isSwappingFundsStepCompleted) return;
    if (isBridgingCompleted) {
      updateIsSwappingStepCompleted(true);
    }
    if (bridgeStatus?.length) {
      setSwapFundsSteps(bridgeStatus);
    }
  }, [
    isBridgingCompleted,
    isSwappingFundsStepCompleted,
    bridgeStatus,
    updateIsSwappingStepCompleted,
  ]);

  const bridgeStepStatus = useMemo(() => {
    if (isSwappingFundsStepCompleted) return 'finish';
    if (!isOnRampingStepCompleted) return 'wait';
    if (isBridgingFailed) return 'error';
    if (isLoading || isBridging) return 'process';
    if (isBridgingCompleted) return 'finish';
    return 'process';
  }, [
    isSwappingFundsStepCompleted,
    isOnRampingStepCompleted,
    isLoading,
    isBridging,
    isBridgingFailed,
    isBridgingCompleted,
  ]);

  const tokensToBeTransferred = useMemo(() => {
    if (!receivingTokens) return [];
    return receivingTokens.map(({ symbol }) => symbol);
  }, [receivingTokens]);

  // TODO: tokensToBeBridged are used to not display this step if the list is empty
  // maybe we should handle it here instead, as we do for useCreateAndTransferFundsToMasterSafeSteps
  // and simply return the step as null
  if (!isOnRampingStepCompleted) {
    return { ...EMPTY_STATE, tokensToBeBridged };
  }

  if (!isSwappingFundsStepCompleted) {
    if (isLoading || isBridging) {
      return { ...PROCESS_STATE, tokensToBeBridged };
    }
    if (hasError) {
      return { ...getQuoteFailedErrorState(onRetry), tokensToBeBridged };
    }
  }

  return {
    tokensToBeTransferred,
    tokensToBeBridged,
    step: {
      status: bridgeStepStatus,
      title: TITLE,
      subSteps: (swapFundsSteps || []).map(({ status, symbol, txnLink }) => {
        const description = (() => {
          if (status === 'finish') return `Swap ${symbol || ''} complete.`;
          if (status === 'error') return `Swap ${symbol || ''} failed.`;
          return `Sending transaction...`;
        })();

        return {
          description,
          txnLink,
          failed: status === 'error' && (
            <FundsAreSafeMessage
              onRetry={onRetry}
              onRetryProps={{ isLoading: bridgeStepStatus === 'process' }}
            />
          ),
        };
      }),
    },
  } satisfies SwapFundsStep;
};
