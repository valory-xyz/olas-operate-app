import { compact } from 'lodash';
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
  const { isOnRampingStepCompleted, isSwappingFundsStepCompleted } =
    useOnRampContext();

  // step 1: Buy crypto
  const buyCryptoStep = useBuyCryptoStep();

  // step 2: Swap funds
  const { tokensToBeTransferred, step: swapStep } =
    useSwapFundsStep(onRampChainId);

  // step 3 & 4: Create Master Safe and transfer funds
  const {
    isMasterSafeCreatedAndFundsTransferred,
    steps: createAndTransferFundsToMasterSafeSteps,
  } = useCreateAndTransferFundsToMasterSafeSteps(
    isSwappingFundsStepCompleted,
    tokensToBeTransferred,
  );

  // Check if all steps are completed to show the setup complete modal
  const [isSetupCompleted, setIsSetupCompleted] = useState(false);
  useEffect(() => {
    if (!isOnRampingStepCompleted) return;
    if (!isSwappingFundsStepCompleted) return;
    if (
      createAndTransferFundsToMasterSafeSteps.length > 0 &&
      !isMasterSafeCreatedAndFundsTransferred
    ) {
      return;
    }

    setIsSetupCompleted(true);
  }, [
    isOnRampingStepCompleted,
    isMasterSafeCreatedAndFundsTransferred,
    isSwappingFundsStepCompleted,
    createAndTransferFundsToMasterSafeSteps.length,
  ]);

  return (
    <>
      <TransactionSteps
        steps={[
          buyCryptoStep,
          swapStep,
          ...compact(createAndTransferFundsToMasterSafeSteps),
        ]}
      />
      {isSetupCompleted && <AgentSetupCompleteModal />}
    </>
  );
};
