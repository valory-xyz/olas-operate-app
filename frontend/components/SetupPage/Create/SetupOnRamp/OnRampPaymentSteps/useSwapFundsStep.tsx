import { TransactionStep } from '@/components/ui/TransactionSteps';

export const SwapFunds = () => null;

export const useSwapFundsStep = () => {
  const step: TransactionStep = {
    status: 'wait',
    title: 'Swap funds',
    subSteps: [],
  };

  return step;
};
