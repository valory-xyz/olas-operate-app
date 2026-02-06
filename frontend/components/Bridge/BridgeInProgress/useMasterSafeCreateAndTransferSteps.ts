import { isNil } from 'lodash';
import { useEffect, useMemo, useRef } from 'react';

import { TokenSymbol } from '@/config/tokens';
import {
  useBridgingSteps,
  useMasterSafeCreationAndTransfer,
  useMasterWalletContext,
  useServices,
} from '@/hooks';
import { BridgingStepStatus, Nullable } from '@/types';

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
    data: creationAndTransferDetails,
    mutateAsync: createMasterSafe,
  } = useMasterSafeCreationAndTransfer(symbols);
  const { getMasterSafeOf, isFetched: isMasterWalletFetched } =
    useMasterWalletContext();

  // Using ref here so the steps don't go null when safe is created
  const canCreateMasterSafeAndTransferRef = useRef<Nullable<boolean>>(null);

  const hasMasterSafe = isMasterWalletFetched
    ? !isNil(getMasterSafeOf?.(selectedAgentConfig.evmHomeChainId))
    : false;

  const isMasterSafeCreated =
    creationAndTransferDetails?.safeCreationDetails?.isSafeCreated;
  const isSafeCreated = isMasterWalletFetched
    ? hasMasterSafe || isMasterSafeCreated
    : false;
  const isTransferCompleted =
    creationAndTransferDetails?.transferDetails?.isTransferComplete;
  const shouldCreateMasterSafe = canCreateMasterSafeAndTransferRef.current;

  useEffect(() => {
    if (
      isMasterWalletFetched &&
      canCreateMasterSafeAndTransferRef.current === null
    ) {
      // Only create master safe during onboarding if it doesn't exist
      canCreateMasterSafeAndTransferRef.current =
        mode === 'onboard' && !hasMasterSafe;
    }
  }, [hasMasterSafe, isMasterWalletFetched, mode]);

  /**
   * Create master safe after the bridging is completed, given it is not created yet.
   */
  useEffect(() => {
    if (!shouldCreateMasterSafe) return;

    // If refill is required, do not create master safe
    if (isRefillRequired) return;

    // If bridging is in progress or has failed, do not proceed
    if (isBridging) return;
    if (isBridgingFailed) return;
    if (!isBridgingCompleted) return;

    // Wait for wallet data to be fetched before proceeding
    if (!isMasterWalletFetched) return;

    // if master safe creation is in progress or if it has failed, do not create master safe.
    if (isLoadingMasterSafeCreation) return;
    if (isErrorMasterSafeCreation) return;
    if (isSafeCreated) return;

    createMasterSafe();
  }, [
    isBridging,
    isBridgingCompleted,
    isBridgingFailed,
    isRefillRequired,
    isMasterWalletFetched,
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
    isSafeCreated,
    createMasterSafe,
    shouldCreateMasterSafe,
  ]);

  const masterSafeCreationDetails = useMemo(() => {
    if (!shouldCreateMasterSafe) return;

    const currentMasterSafeCreationStatus: BridgingStepStatus = (() => {
      if (isRefillRequired) return 'wait';
      if (isBridging || !isBridgingCompleted) return 'wait';
      if (isErrorMasterSafeCreation) return 'error';
      if (isLoadingMasterSafeCreation) return 'process';
      if (isSafeCreated || isTransferCompleted) return 'finish';
      return 'process';
    })();

    return {
      status: currentMasterSafeCreationStatus,
      subSteps: [
        {
          txnLink:
            creationAndTransferDetails?.safeCreationDetails?.txnLink || null,
          onRetry: createMasterSafe,
          onRetryProps: {
            isLoading: currentMasterSafeCreationStatus === 'process',
          },
        },
      ] satisfies StepEvent[],
    };
  }, [
    shouldCreateMasterSafe,
    createMasterSafe,
    isRefillRequired,
    isBridging,
    isBridgingCompleted,
    isErrorMasterSafeCreation,
    isLoadingMasterSafeCreation,
    isSafeCreated,
    isTransferCompleted,
    creationAndTransferDetails?.safeCreationDetails?.txnLink,
  ]);

  const masterSafeTransferDetails = useMemo(() => {
    if (!shouldCreateMasterSafe) return;
    if (!masterSafeCreationDetails) return;

    const currentMasterSafeStatus: BridgingStepStatus = (() => {
      if (isRefillRequired) return 'wait';
      if (isErrorMasterSafeCreation) return 'error';
      if (isBridging || !isBridgingCompleted || !isSafeCreated) return 'wait';
      return isTransferCompleted ? 'finish' : 'wait';
    })();

    return {
      status: currentMasterSafeStatus,
      subSteps: (
        creationAndTransferDetails?.transferDetails?.transfers || []
      ).map((transfer) => ({
        ...transfer,
        onRetry: createMasterSafe,
        onRetryProps: {
          isLoading: masterSafeCreationDetails.status === 'process',
        },
      })) satisfies StepEvent[],
    };
  }, [
    shouldCreateMasterSafe,
    masterSafeCreationDetails,
    creationAndTransferDetails?.transferDetails?.transfers,
    isRefillRequired,
    isErrorMasterSafeCreation,
    isBridging,
    isBridgingCompleted,
    isSafeCreated,
    isTransferCompleted,
    createMasterSafe,
  ]);

  return {
    shouldCreateMasterSafe,
    isLoadingMasterSafeCreation,
    isMasterWalletFetched,
    isSafeCreationAndTransferCompleted: isSafeCreated && isTransferCompleted,
    steps: {
      masterSafeCreation: masterSafeCreationDetails,
      masterSafeTransfer: masterSafeTransferDetails,
    },
  };
};
