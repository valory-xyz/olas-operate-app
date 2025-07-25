import { useEffect } from 'react';

import { TransactionSteps } from '@/components/ui/TransactionSteps';
import { EvmChainId } from '@/constants/chains';
import { useOnRampContext } from '@/hooks/useOnRampContext';

import { useBuyCryptoStep } from './useBuyCryptoStep';
import { useCreateAndTransferFundsToMasterSafeSteps } from './useCreateAndTransferFundsToMasterSafeSteps';
import { useSwapFundsStep } from './useSwapFundsStep';

type OnRampPaymentStepsProps = {
  onRampChainId: EvmChainId;
};

/**
 * Steps for the OnRamp payment process.
 * 1. Buy crypto
 * 2. Swap funds
 * 3. Create Master Safe
 * 4. Transfer funds to the Master Safe
 */
export const OnRampPaymentSteps = ({
  onRampChainId,
}: OnRampPaymentStepsProps) => {
  const { isOnRampingTransactionSuccessful } = useOnRampContext();
  const buyCryptoStep = useBuyCryptoStep();

  const {
    isSwapCompleted,
    tokensToBeTransferred,
    step: swapStep,
  } = useSwapFundsStep(onRampChainId, isOnRampingTransactionSuccessful);
  const {
    isMasterSafeCreatedAndFundsTransferred,
    steps: createAndTransferFundsToMasterSafeSteps,
  } = useCreateAndTransferFundsToMasterSafeSteps(
    isSwapCompleted,
    tokensToBeTransferred,
  );

  useEffect(() => {
    if (!isOnRampingTransactionSuccessful) return;
    if (!isSwapCompleted) return;
    if (!isMasterSafeCreatedAndFundsTransferred) return;

    // TODO: user logged in and move to main page
    window.console.log(
      'All steps completed. You can now proceed to the main page.',
    );
  }, [
    isOnRampingTransactionSuccessful,
    isSwapCompleted,
    isMasterSafeCreatedAndFundsTransferred,
  ]);

  const steps = [
    buyCryptoStep,
    swapStep,
    ...createAndTransferFundsToMasterSafeSteps,
  ];

  return <TransactionSteps steps={steps} />;
};
