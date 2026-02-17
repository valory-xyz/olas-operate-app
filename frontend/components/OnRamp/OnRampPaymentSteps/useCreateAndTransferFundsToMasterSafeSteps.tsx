import { compact, isNil } from 'lodash';
import { useEffect, useMemo } from 'react';

import { FundsAreSafeMessage } from '@/components/ui/FundsAreSafeMessage';
import { TransactionStep } from '@/components/ui/TransactionSteps';
import { TokenSymbol } from '@/config/tokens';
import { useMasterWalletContext, useOnRampContext } from '@/hooks';
import { useMasterSafeCreationAndTransfer } from '@/hooks/useMasterSafeCreationAndTransfer';
import { Nullable } from '@/types';

const EMPTY_STATE_STEPS: Record<string, TransactionStep> = {
  createPearlWallet: { status: 'wait', title: 'Create Pearl Wallet' },
  transferFunds: {
    status: 'wait',
    title: 'Transfer funds to the Pearl Wallet',
  },
};

/**
 * Hook to create a Master Safe and transfer funds to it after the swap is completed.
 * Creates safe if it doesn't exist.
 */
export const useCreateAndTransferFundsToMasterSafeSteps = (
  isSwapCompleted: boolean,
  tokensToBeTransferred: TokenSymbol[],
) => {
  const {
    isPending: isLoadingMasterSafeCreation,
    isError: hasErrorMasterSafeCreation,
    data: creationAndTransferDetails,
    mutate: createMasterSafe,
  } = useMasterSafeCreationAndTransfer(tokensToBeTransferred);
  const { selectedChainId } = useOnRampContext();
  const { getMasterSafeOf, isFetched: isMasterWalletFetched } =
    useMasterWalletContext();

  if (!selectedChainId) {
    throw new Error('Selected chain ID is not set in the on-ramp context');
  }

  const hasMasterSafe = !isNil(getMasterSafeOf?.(selectedChainId));

  // Create master safe if it doesn't exist
  const shouldCreateMasterSafe = !hasMasterSafe;

  const isSafeCreated = isMasterWalletFetched
    ? hasMasterSafe ||
      creationAndTransferDetails?.safeCreationDetails?.isSafeCreated
    : false;
  const isErrorMasterSafeCreation =
    hasErrorMasterSafeCreation ||
    creationAndTransferDetails?.safeCreationDetails?.status === 'error';
  const isTransferComplete =
    creationAndTransferDetails?.transferDetails.isTransferComplete;
  const transferStatuses =
    creationAndTransferDetails?.transferDetails.transfers;

  // Check if the swap is completed and tokens are available for transfer
  // Create safe if we don't have one yet
  useEffect(() => {
    if (!shouldCreateMasterSafe) return;
    if (!isSwapCompleted) return;
    if (isLoadingMasterSafeCreation) return;
    if (isErrorMasterSafeCreation) return;
    if (isSafeCreated) return;

    createMasterSafe();
  }, [
    shouldCreateMasterSafe,
    isSwapCompleted,
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
    isSafeCreated,
    createMasterSafe,
  ]);

  // Step for creating the Master Safe
  const masterSafeCreationStep = useMemo<Nullable<TransactionStep>>(() => {
    // Don't show this step if safe already exists
    if (!shouldCreateMasterSafe) return null;

    const currentMasterSafeCreationStatus = (() => {
      if (!isSwapCompleted) return 'wait';
      if (isErrorMasterSafeCreation) return 'error';
      if (isLoadingMasterSafeCreation) return 'process';
      if (isSafeCreated) return 'finish';
      return 'wait';
    })();

    const description = (() => {
      if (isLoadingMasterSafeCreation) return 'Sending Transaction...';
      if (isSafeCreated) return 'Transaction complete.';
      return null;
    })();

    return {
      status: currentMasterSafeCreationStatus,
      title: 'Create Pearl Wallet',
      subSteps: [
        {
          description,
          txnLink: creationAndTransferDetails?.safeCreationDetails?.txnLink,
          failed: isErrorMasterSafeCreation ? (
            <FundsAreSafeMessage
              onRetry={createMasterSafe}
              onRetryProps={{
                isLoading: currentMasterSafeCreationStatus === 'process',
              }}
            />
          ) : null,
        },
      ],
    };
  }, [
    shouldCreateMasterSafe,
    creationAndTransferDetails?.safeCreationDetails?.txnLink,
    isErrorMasterSafeCreation,
    createMasterSafe,
    isSwapCompleted,
    isLoadingMasterSafeCreation,
    isSafeCreated,
  ]);

  // Step for transferring funds to the Master Safe
  const masterSafeTransferFundStep = useMemo<Nullable<TransactionStep>>(() => {
    // Don't show this step if safe already exists
    if (!shouldCreateMasterSafe) return null;

    const currentMasterSafeCreationStatus = (() => {
      if (!isSwapCompleted) return 'wait';

      if (isLoadingMasterSafeCreation) return 'process';

      const statuses = transferStatuses?.map(({ status }) => status);
      const hasError = statuses?.some((x) => x === 'error');
      if (hasError) return 'error';

      const areFundsBeingTransferred = statuses?.map((x) => x === 'process');
      if (areFundsBeingTransferred?.some((x) => x)) return 'process';

      if (isSafeCreated && isTransferComplete) return 'finish';
      if (isSafeCreated && !isTransferComplete) return 'error';
      return 'wait';
    })();

    return {
      status: currentMasterSafeCreationStatus,
      title: 'Transfer funds to the Pearl Wallet',
      subSteps:
        transferStatuses?.map(({ status, symbol, txnLink }) => {
          const description = (() => {
            if (status === 'finish') return `Transfer ${symbol} complete.`;
            if (status === 'error') return `Transfer ${symbol} failed.`;
            if (status === 'process') return 'Sending transaction...';
            return null;
          })();

          return {
            description,
            txnLink,
            failed:
              status === 'error' ? (
                <FundsAreSafeMessage
                  onRetry={createMasterSafe}
                  onRetryProps={{
                    isLoading: currentMasterSafeCreationStatus === 'process',
                  }}
                />
              ) : null,
          };
        }) || [],
    };
  }, [
    shouldCreateMasterSafe,
    transferStatuses,
    isSwapCompleted,
    isLoadingMasterSafeCreation,
    isSafeCreated,
    isTransferComplete,
    createMasterSafe,
  ]);

  // Check if the master safe is created and funds are transferred
  const isMasterSafeCreatedAndFundsTransferred = useMemo(() => {
    if (isErrorMasterSafeCreation) return false;
    if (!isSafeCreated) return false;
    if (!isTransferComplete) return false;
    if (tokensToBeTransferred.length === 0) return false;

    const transfers = transferStatuses || [];
    if (tokensToBeTransferred.length !== transfers.length) {
      window.console.warn(
        `Expected ${tokensToBeTransferred.length} transfers, but got ${transfers.length}.
        This might indicate that not all tokens were transferred.`,
      );
      return false;
    }

    return transfers.every((transfer) => transfer.status === 'finish');
  }, [
    isErrorMasterSafeCreation,
    isSafeCreated,
    isTransferComplete,
    tokensToBeTransferred.length,
    transferStatuses,
  ]);

  if (!isSwapCompleted) {
    return {
      isMasterSafeCreatedAndFundsTransferred: false,
      steps: shouldCreateMasterSafe
        ? [EMPTY_STATE_STEPS.createPearlWallet, EMPTY_STATE_STEPS.transferFunds]
        : [],
    };
  }

  return {
    isMasterSafeCreatedAndFundsTransferred,
    steps: compact([masterSafeCreationStep, masterSafeTransferFundStep]),
  };
};
