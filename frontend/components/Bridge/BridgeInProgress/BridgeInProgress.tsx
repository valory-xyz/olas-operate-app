import { Flex, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CustomAlert } from '@/components/Alert';
import {
  BridgingSteps,
  StepEvent,
} from '@/components/Bridge/BridgeInProgress/BridgingSteps';
import { BridgeTransferFlow } from '@/components/Bridge/BridgeTransferFlow';
import { AgentSetupCompleteModal } from '@/components/ui/AgentSetupCompleteModal';
import { CardFlex } from '@/components/ui/CardFlex';
import { Pages } from '@/enums/Pages';
import { useBridgingSteps } from '@/hooks/useBridgingSteps';
import { useMasterSafeCreationAndTransfer } from '@/hooks/useMasterSafeCreationAndTransfer';
import { usePageState } from '@/hooks/usePageState';
import { BridgingStepStatus, CrossChainTransferDetails } from '@/types/Bridge';
import { Nullable } from '@/types/Util';

import { BridgeRetryOutcome, EnabledSteps } from '../types';
import { useRetryBridge } from './useRetryBridge';

const { Text, Title } = Typography;

const KeepAppOpenAlert = () => (
  <CustomAlert
    type="warning"
    showIcon
    message="Keep the app open until the process is complete."
    className="mb-32"
  />
);

type BridgeInProgressProps = {
  quoteId: string;
  bridgeRetryOutcome: Nullable<BridgeRetryOutcome>;
  onBridgeRetryOutcome: (outcome: Nullable<BridgeRetryOutcome>) => void;
  enabledStepsAfterBridging?: EnabledSteps;
  onNext: () => void;
  isBridgeCompleted?: boolean;
  isOnboarding?: boolean;
} & CrossChainTransferDetails;

/**
 * Bridge in progress screen.
 */
export const BridgeInProgress = ({
  quoteId,
  fromChain,
  toChain,
  transfers,
  bridgeRetryOutcome,
  onBridgeRetryOutcome,
  enabledStepsAfterBridging = [],
  onNext,
  isBridgeCompleted = false,
  eta,
  isOnboarding,
}: BridgeInProgressProps) => {
  const { goto } = usePageState();
  const symbols = transfers.map((transfer) => transfer.toSymbol);

  const [isBridgeRetrying, setIsBridgeRetrying] = useState(false);
  const refetchBridgeExecute = useRetryBridge();

  const { isBridging, isBridgingFailed, isBridgingCompleted, bridgeStatus } =
    useBridgingSteps(symbols, quoteId);
  const {
    isPending: isLoadingMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
    data: masterSafeDetails,
    mutateAsync: createMasterSafe,
  } = useMasterSafeCreationAndTransfer(symbols);

  const canCreateMasterSafeAndTransfer = enabledStepsAfterBridging.includes(
    'masterSafeCreationAndTransfer',
  );

  const isSafeCreated = masterSafeDetails?.isSafeCreated;
  const isTransferCompleted =
    masterSafeDetails?.masterSafeTransferStatus === 'FINISHED';

  // Create master safe after the bridging is completed
  // and if the master safe is not created yet.
  useEffect(() => {
    if (!canCreateMasterSafeAndTransfer) return;

    // if refill is required, do not create master safe.
    if (bridgeRetryOutcome === 'NEED_REFILL') return;

    // if bridging is in progress or if it has failed, do not create master safe.
    if (isBridging) return;
    if (isBridgingFailed) return;
    if (!isBridgingCompleted) return;

    // if master safe creation is in progress or if it has failed, do not create master safe.
    if (isLoadingMasterSafeCreation) return;
    if (isErrorMasterSafeCreation) return;
    if (masterSafeDetails?.isSafeCreated) return;

    createMasterSafe();
  }, [
    canCreateMasterSafeAndTransfer,
    enabledStepsAfterBridging,
    bridgeRetryOutcome,
    isBridgingCompleted,
    isBridging,
    isBridgingFailed,
    isLoadingMasterSafeCreation,
    masterSafeDetails,
    isErrorMasterSafeCreation,
    createMasterSafe,
  ]);

  // Redirect to main page if all 3 steps are completed
  useEffect(() => {
    // if retry outcome is not null, do not redirect.
    if (bridgeRetryOutcome === 'NEED_REFILL') return;

    // if bridging is in progress or if it has failed, do not redirect.
    if (isBridging) return;
    if (isBridgingFailed) return;
    if (!isBridgingCompleted) return;

    // if master safe creation is not enabled, do not redirect
    if (!canCreateMasterSafeAndTransfer) {
      onNext();
      return;
    }

    // if master safe creation is in progress or if it has failed, do not redirect.
    if (isLoadingMasterSafeCreation) return;
    if (!isSafeCreated) return;
    if (!isTransferCompleted) return;

    /**
     * Do not redirect in case of onboarding, instead show the `AgentSetupCompleteModal`
     * modal on the same page
     */
    if (isOnboarding) {
      onNext();
      return;
    }

    // wait for 3 seconds before redirecting to main page.
    const timeoutId = setTimeout(() => goto(Pages.Main), 3000);
    return () => clearTimeout(timeoutId);
  }, [
    canCreateMasterSafeAndTransfer,
    bridgeRetryOutcome,
    isBridging,
    isBridgingFailed,
    isBridgingCompleted,
    isLoadingMasterSafeCreation,
    isSafeCreated,
    isTransferCompleted,
    goto,
    onNext,
    isOnboarding,
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

  const masterSafeCreationDetails = useMemo(() => {
    if (!canCreateMasterSafeAndTransfer) return;

    const currentMasterSafeCreationStatus: BridgingStepStatus = (() => {
      if (bridgeRetryOutcome === 'NEED_REFILL') return 'wait';
      if (isBridging || !isBridgingCompleted) return 'wait';
      if (isErrorMasterSafeCreation) return 'error';
      if (isLoadingMasterSafeCreation) return 'process';
      if (isSafeCreated) return 'finish';
      return 'process';
    })();

    return {
      status: currentMasterSafeCreationStatus,
      subSteps: [
        {
          txnLink: null, // BE to be updated to return the txn link
          onRetry: createMasterSafe,
          onRetryProps: {
            isLoading: currentMasterSafeCreationStatus === 'process',
          },
        },
      ] satisfies StepEvent[],
    };
  }, [
    canCreateMasterSafeAndTransfer,
    bridgeRetryOutcome,
    isBridging,
    isBridgingCompleted,
    isSafeCreated,
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
    createMasterSafe,
  ]);

  const masterSafeTransferDetails = useMemo(() => {
    if (!canCreateMasterSafeAndTransfer) return;
    if (!masterSafeCreationDetails) return;

    const currentMasterSafeStatus: BridgingStepStatus = (() => {
      if (bridgeRetryOutcome === 'NEED_REFILL') return 'wait';
      if (isErrorMasterSafeCreation) return 'error';
      if (isBridging || !isBridgingCompleted || !isSafeCreated) return 'wait';
      return isTransferCompleted ? 'finish' : 'wait';
    })();

    return {
      status: currentMasterSafeStatus,
      subSteps: (masterSafeDetails?.transfers || []).map((transfer) => ({
        ...transfer,
        onRetry: createMasterSafe,
        onRetryProps: {
          isLoading: masterSafeCreationDetails.status === 'process',
        },
      })) satisfies StepEvent[],
    };
  }, [
    canCreateMasterSafeAndTransfer,
    bridgeRetryOutcome,
    isErrorMasterSafeCreation,
    isSafeCreated,
    isBridging,
    isBridgingCompleted,
    isTransferCompleted,
    masterSafeCreationDetails,
    masterSafeDetails?.transfers,
    createMasterSafe,
  ]);

  const estimatedTimeInMinutes = useMemo(() => {
    const minutes = Math.floor((eta || 0) / 60);
    return Math.max(0, minutes);
  }, [eta]);

  return (
    <Flex justify="center" className="pt-48">
      <CardFlex $noBorder $onboarding bordered={false} className="p-8">
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
          isBridgeCompleted={isBridgeCompleted}
        />

        {!!bridgeDetails && (
          <BridgingSteps
            chainName={toChain}
            bridge={bridgeDetails}
            masterSafeCreation={masterSafeCreationDetails}
            masterSafeTransfer={masterSafeTransferDetails}
          />
        )}
      </CardFlex>

      {isBridgeCompleted && <AgentSetupCompleteModal />}
    </Flex>
  );
};
