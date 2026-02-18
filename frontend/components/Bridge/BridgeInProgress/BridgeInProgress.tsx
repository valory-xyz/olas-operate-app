import { Flex, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Alert, CardFlex } from '@/components/ui';
import { useBridgingSteps, usePageState } from '@/hooks';
import {
  BridgingStepStatus,
  CrossChainTransferDetails,
  Nullable,
} from '@/types';

import { BridgeTransferFlow } from '../BridgeTransferFlow';
import { BridgeMode, BridgeRetryOutcome } from '../types';
import { BridgingSteps, StepEvent } from './BridgingSteps';
import { useMasterSafeCreateAndTransferSteps } from './useMasterSafeCreateAndTransferSteps';
import { useRetryBridge } from './useRetryBridge';

const { Text, Title } = Typography;

const KeepAppOpenAlert = () => (
  <Alert
    type="warning"
    showIcon
    message="Keep the app open until the process is complete."
    className="mb-32"
  />
);

type BridgeInProgressProps = {
  quoteId: string;
  mode?: BridgeMode;
  areAllStepsCompleted?: boolean;
  bridgeRetryOutcome: Nullable<BridgeRetryOutcome>;
  onBridgeRetryOutcome: (outcome: Nullable<BridgeRetryOutcome>) => void;
  onNext: () => void;
} & CrossChainTransferDetails;

export const BridgeInProgress = ({
  quoteId,
  fromChain,
  toChain,
  transfers,
  bridgeRetryOutcome,
  onBridgeRetryOutcome,
  onNext,
  areAllStepsCompleted = false,
  eta,
  mode = 'deposit',
}: BridgeInProgressProps) => {
  const { goto } = usePageState();
  const symbols = transfers.map((transfer) => transfer.toSymbol);

  const [isBridgeRetrying, setIsBridgeRetrying] = useState(false);
  const refetchBridgeExecute = useRetryBridge();

  const { isBridging, isBridgingFailed, isBridgingCompleted, bridgeStatus } =
    useBridgingSteps(symbols, quoteId);

  const isRefillRequired = bridgeRetryOutcome === 'NEED_REFILL';

  const {
    steps: masterSafeSteps,
    shouldCreateMasterSafe,
    isMasterWalletFetched,
    isLoadingMasterSafeCreation,
    isSafeCreationAndTransferCompleted,
  } = useMasterSafeCreateAndTransferSteps({
    mode,
    isRefillRequired,
    quoteId,
    symbols,
  });

  // Update "bridgeState" to "completed" if all the steps are completed
  useEffect(() => {
    // if retry outcome is not null, do not redirect.
    if (bridgeRetryOutcome === 'NEED_REFILL') return;

    // if bridging is in progress or if it has failed, do not redirect.
    if (isBridging) return;
    if (isBridgingFailed) return;
    if (!isBridgingCompleted) return;

    if (!isMasterWalletFetched) return;

    // Don't proceed if all the steps are already completed
    if (areAllStepsCompleted) return;

    if (!shouldCreateMasterSafe) {
      onNext();
      return;
    }

    // Wait for master safe creation to complete
    if (isLoadingMasterSafeCreation || !isSafeCreationAndTransferCompleted) {
      return;
    }

    onNext();
  }, [
    bridgeRetryOutcome,
    isBridging,
    isBridgingFailed,
    isBridgingCompleted,
    isLoadingMasterSafeCreation,
    goto,
    onNext,
    areAllStepsCompleted,
    shouldCreateMasterSafe,
    isMasterWalletFetched,
    isSafeCreationAndTransferCompleted,
  ]);

  const onBridgeFailRetry = useCallback(() => {
    setIsBridgeRetrying(true);
    refetchBridgeExecute((e: Nullable<BridgeRetryOutcome>) =>
      onBridgeRetryOutcome(e),
    ).finally(() => {
      setIsBridgeRetrying(false);
    });
  }, [refetchBridgeExecute, onBridgeRetryOutcome]);

  const bridgeDetails = useMemo(() => {
    const currentBridgeStatus: BridgingStepStatus = (() => {
      if (bridgeRetryOutcome === 'NEED_REFILL') return 'wait';
      if (isBridgingFailed) return 'error';
      if (isBridging) return 'process';
      if (!bridgeStatus) return 'wait';
      if (isBridgingCompleted) return 'finish';

      return 'process';
    })();

    return {
      status: currentBridgeStatus,
      subSteps: (bridgeStatus || []).map((step) => ({
        ...step,
        onRetry: onBridgeFailRetry,
        onRetryProps: {
          isLoading: currentBridgeStatus === 'process' || isBridgeRetrying,
        },
      })) satisfies StepEvent[],
    };
  }, [
    bridgeRetryOutcome,
    isBridging,
    isBridgingFailed,
    isBridgingCompleted,
    bridgeStatus,
    isBridgeRetrying,
    onBridgeFailRetry,
  ]);

  const estimatedTimeInMinutes = useMemo(() => {
    const minutes = Math.floor((eta || 0) / 60);
    return Math.max(1, minutes);
  }, [eta]);

  return (
    <Flex justify="center">
      <CardFlex $noBorder $onboarding className="p-8">
        <Title level={3} className="mt-0">
          Bridge Crypto
        </Title>
        <Title level={5} className="mt-12 mb-8">
          Step 2. Bridging In Progress
        </Title>
        <Text type="secondary" className="mb-24">
          Funds have been received, and the bridging process has been started.
          Estimated time: ~{estimatedTimeInMinutes} minutes.
        </Text>

        <KeepAppOpenAlert />

        <BridgeTransferFlow
          fromChain={fromChain}
          toChain={toChain}
          transfers={transfers}
          isBridgeCompleted={areAllStepsCompleted}
        />

        {!!bridgeDetails && (
          <BridgingSteps
            chainName={toChain}
            bridge={bridgeDetails}
            masterSafeCreation={masterSafeSteps.masterSafeCreation}
            masterSafeTransfer={masterSafeSteps.masterSafeTransfer}
          />
        )}
      </CardFlex>
    </Flex>
  );
};
