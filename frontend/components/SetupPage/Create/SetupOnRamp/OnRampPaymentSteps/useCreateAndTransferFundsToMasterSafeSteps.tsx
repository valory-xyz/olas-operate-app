import { TransactionStep } from '@/components/ui/TransactionSteps';
import { TokenSymbol } from '@/constants/token';
// import { useMasterSafeCreationAndTransferAfterBridging } from '@/hooks/useMasterSafeCreationAndTransferAfterBridging';
// import { useEffect } from 'react';

const EMPTY_STATE: TransactionStep[] = [
  {
    status: 'wait',
    title: 'Create Master Safe',
    subSteps: [],
  },
  {
    status: 'wait',
    title: 'Transfer funds to the Master Safe',
    subSteps: [],
  },
];

export const useCreateAndTransferFundsToMasterSafeSteps = (
  isSwapCompleted: boolean,
  tokensToBeTransferred: TokenSymbol[],
) => {
  const isSwappingCompleted = tokensToBeTransferred.length > 0;
  // const [
  //   isMasterSafeCreatedAndFundsTransferred,
  //   setIsMasterSafeCreatedAndFundsTransferred,
  // ] = useState(false);

  // const {
  //   isPending: isLoadingMasterSafeCreation,
  //   isError: isErrorMasterSafeCreation,
  //   data: masterSafeDetails,
  //   mutateAsync: createMasterSafe,
  // } = useMasterSafeCreationAndTransferAfterBridging(tokensToBeTransferred);

  // useEffect(() => {
  //   if (!isSwappingCompleted) return;
  //   createMasterSafe();
  // }, [isSwappingCompleted, createMasterSafe]);

  if (!isSwappingCompleted) {
    return {
      isMasterSafeCreatedAndFundsTransferred: false,
      steps: EMPTY_STATE,
    };
  }

  return {
    isMasterSafeCreatedAndFundsTransferred: false, // TODO: replace with actual state
    steps: EMPTY_STATE,
  };
};
