import { Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CustomAlert } from '@/components/Alert';
import {
  BridgingSteps,
  StepEvent,
} from '@/components/Bridge/BridgeInProgress/BridgingSteps';
import { EstimatedCompletionTime } from '@/components/Bridge/BridgeInProgress/EstimatedCompletionTime';
import { BridgeTransferFlow } from '@/components/Bridge/BridgeTransferFlow';
import { CardFlex } from '@/components/styled/CardFlex';
import { AgentHeader } from '@/components/ui/AgentHeader';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { BridgingStepStatus, CrossChainTransferDetails } from '@/types/Bridge';
import { Nullable } from '@/types/Util';

import { BridgeRetryOutcome, EnabledSteps } from '../types';
import { useBridgingSteps } from './useBridgingSteps';
import { useMasterSafeCreationAndTransfer } from './useMasterSafeCreationAndTransfer';
import { useRetryBridge } from './useRetryBridge';

const { Text, Title } = Typography;

const KeepAppOpenAlert = () => (
  <CustomAlert
    type="warning"
    fullWidth
    showIcon
    message={
      <Text className="text-sm">
        Keep the app open until bridging is complete.
      </Text>
    }
  />
);

const Header = () => (
  <>
    <CardFlex $noBorder $gap={20} $padding="0 24px">
      <AgentHeader />
      <Title level={3} className="m-0">
        Bridging in progress
      </Title>
    </CardFlex>
    <KeepAppOpenAlert />
  </>
);

type BridgeInProgressProps = {
  quoteId: string;
  bridgeRetryOutcome: Nullable<BridgeRetryOutcome>;
  onBridgeRetryOutcome: (outcome: Nullable<BridgeRetryOutcome>) => void;
  enabledStepsAfterBridging?: EnabledSteps;
  onNext: () => void;
} & CrossChainTransferDetails;

/**
 * Bridge in progress screen.
 */
export const BridgeInProgress = ({
  quoteId,
  fromChain,
  toChain,
  eta,
  transfers,
  bridgeRetryOutcome,
  onBridgeRetryOutcome,
  enabledStepsAfterBridging = [],
  onNext,
}: BridgeInProgressProps) => {
  const { goto } = usePageState();
  const symbols = transfers.map((transfer) => transfer.toSymbol);

  const [isBridgeRetrying, setIsBridgeRetrying] = useState(false);
  const refetchBridgeExecute = useRetryBridge();

  const { isBridging, isBridgingFailed, isBridgingCompleted, bridgeStatus } =
    useBridgingSteps(quoteId, symbols);
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

  return (
    <>
      <Header />
      <CardFlex $noBorder $gap={16} $padding="0 24px">
        {eta && <EstimatedCompletionTime timeInSeconds={eta} />}
        <BridgeTransferFlow
          fromChain={fromChain}
          toChain={toChain}
          transfers={transfers}
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
    </>
  );
};
