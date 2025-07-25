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
  // const [
  //   isMasterSafeCreatedAndFundsTransferred,
  //   setIsMasterSafeCreatedAndFundsTransferred,
  // ] = useState(false);

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
    createMasterSafe,
  ]);

  if (!isSwapCompleted) {
    return {
      isMasterSafeCreatedAndFundsTransferred: false,
      steps: EMPTY_STATE,
    };
  }

  return {
    isMasterSafeCreatedAndFundsTransferred: false, // TODO: replace with actual state
    steps: [masterSafeCreationStep],
  };
};
