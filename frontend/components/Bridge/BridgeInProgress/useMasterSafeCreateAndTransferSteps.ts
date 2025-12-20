import { isNil } from 'lodash';
import { useEffect, useMemo } from 'react';

import { TokenSymbol } from '@/config/tokens';
import {
  useBridgingSteps,
  useMasterSafeCreationAndTransfer,
  useMasterWalletContext,
  useServices,
} from '@/hooks';
import { BridgingStepStatus } from '@/types';

import { BridgeMode } from '../types';
import { StepEvent } from './BridgingSteps';

type UseMasterSafeCreateAndTransferStepsProps = {
  mode: BridgeMode;
  isRefillRequired: boolean;
  quoteId: string;
  symbols: TokenSymbol[];
};

export const useMasterSafeCreateAndTransferSteps = ({
  mode,
  isRefillRequired,
  symbols,
  quoteId,
}: UseMasterSafeCreateAndTransferStepsProps) => {
  const { selectedAgentConfig } = useServices();
  const { isBridging, isBridgingFailed, isBridgingCompleted } =
    useBridgingSteps(symbols, quoteId);
  const {
    isPending: isLoadingMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
    data: masterSafeDetails,
    mutateAsync: createMasterSafe,
  } = useMasterSafeCreationAndTransfer(symbols);
  const { getMasterSafeOf, isFetched: isMasterWalletFetched } =
    useMasterWalletContext();

  const hasMasterSafe = isMasterWalletFetched
    ? !isNil(getMasterSafeOf?.(selectedAgentConfig.evmHomeChainId))
    : false;

  // Only create master safe during onboarding if it doesn't exist
  const canCreateMasterSafeAndTransfer =
    mode === 'onboarding' && !hasMasterSafe;
  const isSafeCreated = isMasterWalletFetched
    ? hasMasterSafe || masterSafeDetails?.isSafeCreated
    : false;
  const isTransferCompleted =
    masterSafeDetails?.masterSafeTransferStatus === 'FINISHED';

  /**
   * Create master safe after the bridging is completed, given it is not created yet.
   */
  useEffect(() => {
    if (!canCreateMasterSafeAndTransfer) return;

    // If refill is required, do not create master safe
    if (isRefillRequired) return;

    // If bridging is in progress or has failed, do not proceed
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
    isBridging,
    isBridgingCompleted,
    isBridgingFailed,
    isRefillRequired,
    isMasterWalletFetched,
    hasMasterSafe,
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
    masterSafeDetails?.isSafeCreated,
    createMasterSafe,
    canCreateMasterSafeAndTransfer,
  ]);

  const masterSafeCreationDetails = useMemo(() => {
    if (!canCreateMasterSafeAndTransfer) return;

    const currentMasterSafeCreationStatus: BridgingStepStatus = (() => {
      if (isRefillRequired) return 'wait';
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
    createMasterSafe,
    isRefillRequired,
    isBridging,
    isBridgingCompleted,
    isErrorMasterSafeCreation,
    isLoadingMasterSafeCreation,
    isSafeCreated,
  ]);

  const masterSafeTransferDetails = useMemo(() => {
    if (!canCreateMasterSafeAndTransfer) return;
    if (!masterSafeCreationDetails) return;

    const currentMasterSafeStatus: BridgingStepStatus = (() => {
      if (isRefillRequired) return 'wait';
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
    masterSafeCreationDetails,
    masterSafeDetails?.transfers,
    isRefillRequired,
    isErrorMasterSafeCreation,
    isBridging,
    isBridgingCompleted,
    isSafeCreated,
    isTransferCompleted,
    createMasterSafe,
  ]);

  return {
    shouldCreateMasterSafe: canCreateMasterSafeAndTransfer,
    isLoadingMasterSafeCreation,
    isMasterWalletFetched,
    isSafeCreationAndTransferCompleted: isSafeCreated && isTransferCompleted,
    steps: {
      masterSafeCreation: masterSafeCreationDetails,
      masterSafeTransfer: masterSafeTransferDetails,
    },
  };
};
