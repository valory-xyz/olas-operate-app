import { useEffect, useMemo, useState } from 'react';

import { AgentSetupCompleteModal } from '@/components/ui/AgentSetupCompleteModal';
import { TransactionSteps } from '@/components/ui/TransactionSteps';
import { EvmChainId } from '@/constants/chains';
import { useMasterWalletContext, useOnRampContext } from '@/hooks';

import { useBuyCryptoStep } from './useBuyCryptoStep';
import { useCreateAndTransferFundsToMasterSafeSteps } from './useCreateAndTransferFundsToMasterSafeSteps';
import { useSwapFundsStep } from './useSwapFundsStep';

type OnRampPaymentStepsProps = {
  onRampChainId: EvmChainId;
  mode: 'onboard' | 'deposit';
};

/**
 * Steps for the OnRamp payment process.
 * 1. Buy crypto
 * 2. Swap funds
 * 3. Create Master Safe (if it doesn't exist)
 * 4. Transfer funds to the Master Safe
 */
export const OnRampPaymentSteps = ({
  onRampChainId,
  mode,
}: OnRampPaymentStepsProps) => {
  const { isOnRampingStepCompleted, isSwappingFundsStepCompleted } =
    useOnRampContext();
  const { getMasterSafeOf } = useMasterWalletContext();

  const existingMasterSafe = useMemo(
    () => getMasterSafeOf?.(onRampChainId),
    [getMasterSafeOf, onRampChainId],
  );

  const masterSafeExists = !!existingMasterSafe;

  // step 1: Buy crypto
  const buyCryptoStep = useBuyCryptoStep();

  // step 2: Swap funds
  const { tokensToBeTransferred, step: swapStep } = useSwapFundsStep(
    onRampChainId,
    mode,
  );

  // step 3 & 4: Create Master Safe and transfer funds
  const {
    isMasterSafeCreatedAndFundsTransferred,
    steps: createAndTransferFundsToMasterSafeSteps,
  } = useCreateAndTransferFundsToMasterSafeSteps(
    isSwappingFundsStepCompleted,
    tokensToBeTransferred,
  );

  // If masterSafe exists, skip create/transfer steps
  const steps = masterSafeExists
    ? [buyCryptoStep, swapStep]
    : [buyCryptoStep, swapStep, ...createAndTransferFundsToMasterSafeSteps];

  const [isSetupCompleted, setIsSetupCompleted] = useState(false);
  useEffect(() => {
    if (!masterSafeExists) return;
    if (!isOnRampingStepCompleted) return;
    if (!isSwappingFundsStepCompleted) return;
    if (!isMasterSafeCreatedAndFundsTransferred) return;

    setIsSetupCompleted(true);
  }, [
    masterSafeExists,
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
