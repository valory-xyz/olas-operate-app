import { TransactionStep } from '@/components/ui/TransactionSteps';

export const useCreateAndTransferFundsToMasterSafeSteps = () => {
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

  return steps;
};
