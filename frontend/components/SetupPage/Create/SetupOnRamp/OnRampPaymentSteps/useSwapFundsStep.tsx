import { ReloadOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useMemo } from 'react';

import { FundsAreSafeMessage } from '@/components/ui/FundsAreSafeMessage';
import { TransactionStep } from '@/components/ui/TransactionSteps';
import { EvmChainId } from '@/constants/chains';
import { useBridgingSteps } from '@/hooks/useBridgingSteps';

import { useBridgeRequirementsQuery } from '../hooks/useBridgeRequirementsQuery';

const { Text } = Typography;

const EMPTY_STATE: TransactionStep = {
  status: 'wait',
  title: 'Swap funds',
  subSteps: [],
};

const IN_PROCESS_STATE: TransactionStep = {
  status: 'process',
  title: 'Swap funds',
  subSteps: [{ description: 'Sending transaction...' }],
};

const getQuoteFailedErrorState = (onRetry: () => void): TransactionStep => ({
  status: 'error',
  title: 'Swap funds',
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
});

export const useSwapFundsStep = (
  onRampChainId: EvmChainId,
  isOnRampingCompleted: boolean,
) => {
  const {
    isLoading,
    hasError,
    bridgeFundingRequirements,
    tokensToBeBridged,
    onRetry,
  } = useBridgeRequirementsQuery(onRampChainId);

  const { isBridgingCompleted, isBridgingFailed, isBridging, bridgeStatus } =
    useBridgingSteps(tokensToBeBridged, bridgeFundingRequirements?.id);

  const bridgeStepStatus = useMemo(() => {
    if (isBridging) return 'process';
    if (isBridgingFailed) return 'error';
    if (isBridgingCompleted) return 'finish';
    return 'wait';
  }, [isBridging, isBridgingFailed, isBridgingCompleted]);

  if (!isOnRampingCompleted) {
    return { isSwapCompleted: false, step: EMPTY_STATE };
  }

  if (isLoading || isBridging) {
    return { isSwapCompleted: false, step: IN_PROCESS_STATE };
  }

  if (hasError) {
    return { isSwapCompleted: false, step: getQuoteFailedErrorState(onRetry) };
  }

  return {
    isSwapCompleted: false,
    step: {
      status: bridgeStepStatus,
      title: 'Swap funds',
      subSteps: (bridgeStatus || []).map((step) => {
        const description = (() => {
          if (step.status === 'finish') {
            return `Swap ${step.symbol || ''} complete.`;
          }
          if (step.status === 'error') {
            return `Swap ${step.symbol || ''} failed.`;
          }
          return `Sending transaction...`;
        })();

        return {
          description,
          txnLink: step.txnLink ?? undefined,
          failed: step.status === 'error' && (
            <FundsAreSafeMessage
              onRetry={onRetry}
              onRetryProps={{ isLoading: bridgeStepStatus === 'process' }}
            />
          ),
        };
      }),
    } satisfies TransactionStep,
  };
};
