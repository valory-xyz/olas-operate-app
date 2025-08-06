import { ReloadOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { FundsAreSafeMessage } from '@/components/ui/FundsAreSafeMessage';
import { TransactionStep } from '@/components/ui/TransactionSteps';
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol } from '@/constants/token';
import { useBridgingSteps } from '@/hooks/useBridgingSteps';
import { useOnRampContext } from '@/hooks/useOnRampContext';

import { useBridgeRequirementsQuery } from '../hooks/useBridgeRequirementsQuery';

const { Text } = Typography;

const TITLE = 'Swap funds';

type SwapFundsStep = {
  isSwapCompleted: boolean;
  tokensToBeTransferred: TokenSymbol[];
  step: TransactionStep;
};

const EMPTY_STATE: SwapFundsStep = {
  isSwapCompleted: false,
  tokensToBeTransferred: [],
  step: {
    status: 'wait',
    title: TITLE,
    subSteps: [],
  },
};

const PROCESS_STATE: SwapFundsStep = {
  isSwapCompleted: false,
  tokensToBeTransferred: [],
  step: {
    status: 'process',
    title: TITLE,
    subSteps: [{ description: 'Sending transaction...' }],
  },
};

const getQuoteFailedErrorState = (onRetry: () => void): SwapFundsStep => ({
  isSwapCompleted: false,
  tokensToBeTransferred: [],
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
  isOnRampingCompleted: boolean,
) => {
  const { isOnRampingStepCompleted } = useOnRampContext();
  const {
    isLoading,
    hasError,
    bridgeFundingRequirements,
    receivingTokens,
    tokensToBeBridged,
    onRetry,
  } = useBridgeRequirementsQuery(
    onRampChainId,
    isOnRampingStepCompleted,
    true, // stop polling, since we want to execute the swap immediately
  );

  const [quoteId, setQuoteId] = useState<string | undefined>();

  // If the on-ramping is not completed, we do not proceed with the swap step.
  const updatedQuoteId = useMemo(() => {
    if (isLoading) return;
    if (!isOnRampingCompleted) return;
    if (!bridgeFundingRequirements) return;
    return bridgeFundingRequirements.id;
  }, [isLoading, isOnRampingCompleted, bridgeFundingRequirements]);

  // If the quoteId is not set, we set it to the fetched quoteId.
  useEffect(() => {
    if (hasError) {
      setQuoteId(undefined);
    }
    if (updatedQuoteId && !quoteId) {
      setQuoteId(updatedQuoteId);
    }
  }, [hasError, updatedQuoteId, quoteId]);

  const { isBridgingCompleted, isBridgingFailed, isBridging, bridgeStatus } =
    useBridgingSteps(tokensToBeBridged, quoteId);

  // LOG
  window.console.log('useBridgingSteps', {
    quoteId,
    isBridging,
    isBridgingFailed,
    isBridgingCompleted,
    bridgeStatus,
  });

  const bridgeStepStatus = useMemo(() => {
    if (!isOnRampingCompleted) return 'wait';
    if (isLoading || isBridging) return 'process';
    if (isBridgingFailed) return 'error';
    if (isBridgingCompleted) return 'finish';
    return 'process';
  }, [
    isOnRampingCompleted,
    isLoading,
    isBridging,
    isBridgingFailed,
    isBridgingCompleted,
  ]);

  const tokensToBeTransferred = useMemo(() => {
    if (!receivingTokens) return [];
    return receivingTokens.map(({ symbol }) => symbol);
  }, [receivingTokens]);

  if (!isOnRampingCompleted) return EMPTY_STATE;
  if (isLoading || isBridging) return PROCESS_STATE;
  if (hasError) return getQuoteFailedErrorState(onRetry);

  return {
    isSwapCompleted: isBridgingCompleted,
    tokensToBeTransferred,
    step: {
      status: bridgeStepStatus,
      title: TITLE,
      subSteps: (bridgeStatus || []).map(({ status, symbol, txnLink }) => {
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
