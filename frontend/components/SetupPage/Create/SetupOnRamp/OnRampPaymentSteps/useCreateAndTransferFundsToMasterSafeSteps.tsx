import { useEffect, useMemo } from 'react';

import { FundsAreSafeMessage } from '@/components/ui/FundsAreSafeMessage';
import { TransactionStep } from '@/components/ui/TransactionSteps';
import { TokenSymbol } from '@/constants/token';
import { useMasterSafeCreationAndTransferAfterBridging } from '@/hooks/useMasterSafeCreationAndTransferAfterBridging';

const EMPTY_STATE: TransactionStep[] = [
  { status: 'wait', title: 'Create Master Safe' },
  { status: 'wait', title: 'Transfer funds to the Master Safe' },
];

export const useCreateAndTransferFundsToMasterSafeSteps = (
  isSwapCompleted: boolean,
  tokensToBeTransferred: TokenSymbol[],
) => {
  const {
    isPending: isLoadingMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
    data: masterSafeDetails,
    mutateAsync: createMasterSafe,
  } = useMasterSafeCreationAndTransferAfterBridging(tokensToBeTransferred);

  useEffect(() => {
    if (!isSwapCompleted) return;
    if (tokensToBeTransferred.length === 0) return;
    createMasterSafe();
  }, [isSwapCompleted, tokensToBeTransferred, createMasterSafe]);

  const isSafeCreated = masterSafeDetails?.isSafeCreated;

  const masterSafeCreationStep: TransactionStep = useMemo(() => {
    const currentMasterSafeCreationStatus = (() => {
      if (!isSwapCompleted) return 'wait';
      if (isErrorMasterSafeCreation) return 'error';
      if (isLoadingMasterSafeCreation) return 'process';
      if (isSafeCreated) return 'finish';
      return 'process';
    })();

    const description = (() => {
      if (isLoadingMasterSafeCreation) return 'Sending Transaction...';
      if (isSafeCreated) return 'Transaction complete.';
      return null;
    })();

    return {
      status: currentMasterSafeCreationStatus,
      title: 'Create Master Safe',
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

  const masterSafeTransferFundStep: TransactionStep = useMemo(() => {
    const currentMasterSafeCreationStatus = (() => {
      if (!isSwapCompleted) return 'wait';
      if (isErrorMasterSafeCreation) return 'error';
      if (isLoadingMasterSafeCreation) return 'process';
      if (isSafeCreated) return 'finish';
      return 'process';
    })();

    return {
      status: currentMasterSafeCreationStatus,
      title: 'Transfer funds to the Master Safe',
      subSteps: masterSafeDetails?.transfers.map(
        ({ status, symbol, txnLink }) => {
          const description = (() => {
            if (status === 'finish') return `Transfer ${symbol} complete.`;
            if (status === 'process') return 'Sending transaction...';
            if (status === 'error') return `Transfer ${symbol} failed.`;
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
    isErrorMasterSafeCreation,
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
    if (tokensToBeTransferred.length !== transfers.length) return false;

    return masterSafeDetails?.transfers.every(
      (transfer) => transfer.status === 'finish',
    );
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

  return {
    isMasterSafeCreatedAndFundsTransferred,
    steps: [masterSafeCreationStep, masterSafeTransferFundStep],
  };
};
