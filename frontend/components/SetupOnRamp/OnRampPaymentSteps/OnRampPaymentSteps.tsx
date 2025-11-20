import { useEffect, useState } from 'react';

import { AgentSetupCompleteModal } from '@/components/ui/AgentSetupCompleteModal';
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
  const {
    isOnRampingStepCompleted,
    isSwappingFundsStepCompleted,
    isFromDepositFlow,
  } = useOnRampContext();

  // step 1: Buy crypto
  const buyCryptoStep = useBuyCryptoStep();

  // step 2: Swap funds
  const { tokensToBeTransferred, step: swapStep } =
    useSwapFundsStep(onRampChainId);

  // step 3 & 4: Create Master Safe and transfer funds (for setup flow)
  const {
    isMasterSafeCreatedAndFundsTransferred,
    steps: createAndTransferFundsToMasterSafeSteps,
  } = useCreateAndTransferFundsToMasterSafeSteps(
    isSwappingFundsStepCompleted,
    tokensToBeTransferred,
  );

  // For deposit flow: skip create/transfer steps since Pearl Wallet already exists
  const steps = isFromDepositFlow
    ? [buyCryptoStep, swapStep]
    : [buyCryptoStep, swapStep, ...createAndTransferFundsToMasterSafeSteps];

  const [isSetupCompleted, setIsSetupCompleted] = useState(false);
  useEffect(() => {
    if (isFromDepositFlow) return;
    if (!isOnRampingStepCompleted) return;
    if (!isSwappingFundsStepCompleted) return;
    if (!isMasterSafeCreatedAndFundsTransferred) return;

    setIsSetupCompleted(true);
  }, [
    isFromDepositFlow,
    isOnRampingStepCompleted,
    isMasterSafeCreatedAndFundsTransferred,
    isSwappingFundsStepCompleted,
  ]);

  return (
    <>
      <TransactionSteps steps={steps} />
      {isSetupCompleted && <AgentSetupCompleteModal />}
    </>
  );
};
