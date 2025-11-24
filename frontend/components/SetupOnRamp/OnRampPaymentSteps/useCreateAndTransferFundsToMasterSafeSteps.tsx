import { useEffect, useMemo } from 'react';

import { FundsAreSafeMessage } from '@/components/ui/FundsAreSafeMessage';
import { TransactionStep } from '@/components/ui/TransactionSteps';
import { TokenSymbol } from '@/constants/token';
import {
  useMasterSafeCreationAndTransfer,
  useMasterWalletContext,
  useServices,
} from '@/hooks';

const EMPTY_STATE: TransactionStep[] = [
  { status: 'wait', title: 'Create Pearl Wallet' },
  { status: 'wait', title: 'Transfer funds to the Pearl Wallet' },
];

/**
 * Hook to create a Master Safe and transfer funds to it after the swap is completed.
 */
export const useCreateAndTransferFundsToMasterSafeSteps = (
  isSwapCompleted: boolean,
  tokensToBeTransferred: TokenSymbol[],
) => {
  const { selectedAgentConfig } = useServices();
  const { getMasterSafeOf } = useMasterWalletContext();
  const {
    isPending: isLoadingMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
    data: masterSafeDetails,
    mutateAsync: createMasterSafe,
  } = useMasterSafeCreationAndTransfer(tokensToBeTransferred);

  // Check if master safe already exists
  const existingMasterSafe = useMemo(
    () => getMasterSafeOf?.(selectedAgentConfig.evmHomeChainId),
    [getMasterSafeOf, selectedAgentConfig.evmHomeChainId],
  );

  const isSafeCreated =
    masterSafeDetails?.isSafeCreated || !!existingMasterSafe;

  // Check if the swap is completed and tokens are available for transfer
  useEffect(() => {
    if (!isSwapCompleted) return;
    if (isLoadingMasterSafeCreation) return;
    if (isErrorMasterSafeCreation) return;
    // Don't create if safe already exists or was just created
    if (isSafeCreated) return;

    createMasterSafe();
  }, [
    isSwapCompleted,
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
    existingMasterSafe,
    masterSafeDetails,
    createMasterSafe,
    isSafeCreated,
  ]);

  // Step for creating the Master Safe
  const masterSafeCreationStep = useMemo<TransactionStep>(() => {
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
          txnLink: masterSafeDetails?.txnLink,
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
    isSwapCompleted,
    isErrorMasterSafeCreation,
    isLoadingMasterSafeCreation,
    isSafeCreated,
    masterSafeDetails?.txnLink,
    createMasterSafe,
  ]);

  // Step for transferring funds to the Master Safe
  const masterSafeTransferFundStep = useMemo<TransactionStep>(() => {
    const currentMasterSafeCreationStatus = (() => {
      if (!isSwapCompleted) return 'wait';

      if (isLoadingMasterSafeCreation) return 'process';

      const statuses = masterSafeDetails?.transfers.map(({ status }) => status);
      const hasError = statuses?.some((x) => x === 'error');
      if (hasError) return 'error';

      const areFundsBeingTransferred = statuses?.map((x) => x === 'process');
      if (areFundsBeingTransferred?.some((x) => x)) return 'process';

      if (isSafeCreated) return 'finish';
      return 'wait';
    })();

    return {
      status: currentMasterSafeCreationStatus,
      title: 'Transfer funds to the Pearl Wallet',
      subSteps: masterSafeDetails?.transfers.map(
        ({ status, symbol, txnLink }) => {
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
        },
      ),
    };
  }, [
    isSwapCompleted,
    isLoadingMasterSafeCreation,
    isSafeCreated,
    masterSafeDetails?.transfers,
    createMasterSafe,
  ]);

  // Check if the master safe is created and funds are transferred
  const isMasterSafeCreatedAndFundsTransferred = useMemo(() => {
    if (isErrorMasterSafeCreation) return false;
    if (!isSafeCreated) return false;
    if (tokensToBeTransferred.length === 0) return false;

    const transfers = masterSafeDetails?.transfers || [];
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
    tokensToBeTransferred.length,
    masterSafeDetails?.transfers,
  ]);

  if (!isSwapCompleted) {
    return {
      isMasterSafeCreatedAndFundsTransferred: false,
      steps: EMPTY_STATE,
    };
  }

  // If safe already exists, mark as completed and return empty steps
  if (existingMasterSafe) {
    return {
      isMasterSafeCreatedAndFundsTransferred: true,
      steps: [],
    };
  }

  return {
    isMasterSafeCreatedAndFundsTransferred,
    steps: [masterSafeCreationStep, masterSafeTransferFundStep],
  };
};
