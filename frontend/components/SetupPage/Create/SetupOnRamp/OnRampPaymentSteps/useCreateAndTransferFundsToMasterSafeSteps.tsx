import { TransactionStep } from '@/components/ui/TransactionSteps';

export const useCreateAndTransferFundsToMasterSafeSteps = (
  isSwappingDone: boolean,
) => {
  // const [
  //   isMasterSafeCreatedAndFundsTransferred,
  //   setIsMasterSafeCreatedAndFundsTransferred,
  // ] = useState(false);

  const steps: TransactionStep[] = [
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

  return {
    isMasterSafeCreatedAndFundsTransferred: false, // TODO: replace with actual state
    steps: isSwappingDone ? steps : steps, // TODO: steps with all progress
  };
};
