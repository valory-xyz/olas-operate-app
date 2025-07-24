import { TransactionStep } from '@/components/ui/TransactionSteps';

export const useSwapFundsStep = (isOnRampingCompleted: boolean) => {
  const step: TransactionStep = {
    status: 'wait',
    title: 'Swap funds',
    subSteps: [],
  };

  return {
    isSwapCompleted: false,
    step: isOnRampingCompleted ? step : step, // TODO
  };
};
