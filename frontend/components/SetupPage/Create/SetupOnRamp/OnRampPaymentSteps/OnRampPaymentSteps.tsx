import { useEffect } from 'react';

import { TransactionSteps } from '@/components/ui/TransactionSteps';
import { EvmChainId } from '@/constants/chains';
import { Pages } from '@/enums/Pages';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { usePageState } from '@/hooks/usePageState';

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

  // Navigate to the main page after all steps are completed
  useEffect(() => {
    if (!isOnRampingTransactionSuccessful) return;
    if (!isSwapCompleted) return;
    if (!isMasterSafeCreatedAndFundsTransferred) return;

    goto(Pages.Main);
  }, [
    isOnRampingTransactionSuccessful,
    isSwapCompleted,
    isMasterSafeCreatedAndFundsTransferred,
    goto,
  ]);

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
