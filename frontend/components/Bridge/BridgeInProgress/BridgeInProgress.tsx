import { Flex, Typography } from 'antd';
import { isNil } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Alert, CardFlex } from '@/components/ui';
import {
  useBridgingSteps,
  useMasterSafeCreationAndTransfer,
  useMasterWalletContext,
  usePageState,
} from '@/hooks';
import {
  BridgingStepStatus,
  CrossChainTransferDetails,
  Nullable,
} from '@/types';
import { asAllEvmChainId } from '@/utils';

import { BridgeTransferFlow } from '../BridgeTransferFlow';
import { BridgeRetryOutcome, EnabledSteps } from '../types';
import { BridgingSteps, StepEvent } from './BridgingSteps';
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

  const { getMasterSafeOf, isFetched: isMasterWalletFetched } =
    useMasterWalletContext();

  const canCreateMasterSafeAndTransfer = enabledStepsAfterBridging.includes(
    'masterSafeCreationAndTransfer',
  );

  const hasMasterSafe = isMasterWalletFetched
    ? !isNil(getMasterSafeOf?.(asAllEvmChainId(toChain)))
    : false;

  const isSafeCreated = isMasterWalletFetched
    ? hasMasterSafe || masterSafeDetails?.isSafeCreated
    : false;

  const isTransferCompleted =
    masterSafeDetails?.masterSafeTransferStatus === 'FINISHED';

  // Create master safe after the bridging is completed
  // and if the master safe is not created yet.
  useEffect(() => {
    if (!canCreateMasterSafeAndTransfer) return;

    // if refill is required, do not create master safe.
    if (bridgeRetryOutcome === 'NEED_REFILL') return;

    // if bridging is in progress or if it has failed, do not proceed
    if (isBridging) return;
    if (isBridgingFailed) return;
    if (!isBridgingCompleted) return;

    // If master safe already exists, do not create it
    if (!isMasterWalletFetched) return;
    if (hasMasterSafe) return;

    // if master safe creation is in progress or if it has failed, do not create master safe.
    if (isLoadingMasterSafeCreation) return;
    if (isErrorMasterSafeCreation) return;
    if (masterSafeDetails?.isSafeCreated) return;

    createMasterSafe();
  }, [
    bridgeRetryOutcome,
    canCreateMasterSafeAndTransfer,
    createMasterSafe,
    hasMasterSafe,
    isBridging,
    isBridgingCompleted,
    isBridgingFailed,
    isErrorMasterSafeCreation,
    isLoadingMasterSafeCreation,
    isMasterWalletFetched,
    masterSafeDetails?.isSafeCreated,
  ]);

  // Redirect to main page if all required steps are completed
  useEffect(() => {
    // if retry outcome is not null, do not redirect.
    if (bridgeRetryOutcome === 'NEED_REFILL') return;

    // if bridging is in progress or if it has failed, do not redirect.
    if (isBridging) return;
    if (isBridgingFailed) return;
    if (!isBridgingCompleted) return;

    if (!isMasterWalletFetched) return;

    // If has master safe already exists, we can move to the next stage
    if (hasMasterSafe && isOnboarding && !isBridgeCompleted) {
      onNext();
      return;
    }

    // if master safe creation is not enabled, do not redirect
    // Only applicable for depositing, not onboarding
    if (!canCreateMasterSafeAndTransfer && !isOnboarding) {
      onNext();
      return;
    }

    // if master safe creation is in progress or if it has failed, do not redirect.
    if (isLoadingMasterSafeCreation) return;
    if (!isSafeCreated) return;
    if (!isTransferCompleted) return;

    if (isBridgeCompleted) return;
    onNext();
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
    isBridgeCompleted,
    hasMasterSafe,
    isMasterWalletFetched,
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
    </Flex>
  );
};
