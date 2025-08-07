import { useEffect } from 'react';

import { TransactionSteps } from '@/components/ui/TransactionSteps';
import { EvmChainId } from '@/constants/chains';
import { Pages } from '@/enums/Pages';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { usePageState } from '@/hooks/usePageState';
import { delayInSeconds } from '@/utils/delay';

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
  const { goto } = usePageState();
  const { isOnRampingStepCompleted } = useOnRampContext();

  // step 1: Buy crypto
  const buyCryptoStep = useBuyCryptoStep();

  // step 2: Swap funds
  const {
    isSwapCompleted,
    tokensToBeTransferred,
    step: swapStep,
  } = useSwapFundsStep(onRampChainId);

  // step 3 & 4: Create Master Safe and transfer funds
  const {
    isMasterSafeCreatedAndFundsTransferred,
    steps: createAndTransferFundsToMasterSafeSteps,
  } = useCreateAndTransferFundsToMasterSafeSteps(
    isSwapCompleted,
    tokensToBeTransferred,
  );

  // Navigate to the main page after all steps are completed
  useEffect(() => {
    if (!isOnRampingStepCompleted) return;
    if (!isSwapCompleted) return;
    if (!isMasterSafeCreatedAndFundsTransferred) return;

    // Delay to ensure the UI updates before navigating
    delayInSeconds(2).then(() => goto(Pages.Main));
  }, [
    isOnRampingStepCompleted,
    isSwapCompleted,
    isMasterSafeCreatedAndFundsTransferred,
    goto,
  ]);

  window.console.log('OnRampPaymentSteps', {
    isOnRampingStepCompleted,
    isSwapCompleted,
    isMasterSafeCreatedAndFundsTransferred,
  });

  return (
    <TransactionSteps
      steps={[
        buyCryptoStep,
        swapStep,
        ...createAndTransferFundsToMasterSafeSteps,
      ]}
    />
  );
};
