import { TransactionSteps } from '@/components/ui/TransactionSteps';

import { useBuyCryptoStep } from './useBuyCryptoStep';
import { useCreateAndTransferFundsToMasterSafeSteps } from './useCreateAndTransferFundsToMasterSafeSteps';
import { useSwapFundsStep } from './useSwapFundsStep';

export const OnRampPaymentSteps = () => {
  const steps = [
    useBuyCryptoStep(),
    useSwapFundsStep(),
    ...useCreateAndTransferFundsToMasterSafeSteps(),
  ];

  return <TransactionSteps steps={steps} />;
};
