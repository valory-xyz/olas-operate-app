import compact from 'lodash/compact';
import { useEffect, useState } from 'react';

import { AgentSetupCompleteModal } from '@/components/ui/AgentSetupCompleteModal';
import { TransactionSteps } from '@/components/ui/TransactionSteps';
import { EvmChainId } from '@/constants/chains';
import { useOnRampContext } from '@/hooks/useOnRampContext';

import { GetOnRampRequirementsParams, OnRampMode } from '../types';
import { useBuyCryptoStep } from './useBuyCryptoStep';
import { useCreateAndTransferFundsToMasterSafeSteps } from './useCreateAndTransferFundsToMasterSafeSteps';
import { useSwapFundsStep } from './useSwapFundsStep';

type OnRampPaymentStepsProps = {
  mode: OnRampMode;
  onRampChainId: EvmChainId;
  getOnRampRequirementsParams: GetOnRampRequirementsParams;
  onOnRampCompleted?: () => void;
};

/**
 * Steps for the OnRamp payment process.
 * 1. Buy crypto
 * 2. Swap funds
 * 3. Create Master Safe (onboard mode only)
 * 4. Transfer funds to the Master Safe (onboard mode only)
 */
export const OnRampPaymentSteps = ({
  mode,
  onRampChainId,
  getOnRampRequirementsParams,
  onOnRampCompleted,
}: OnRampPaymentStepsProps) => {
  const { isOnRampingStepCompleted, isSwappingFundsStepCompleted } =
    useOnRampContext();

  // step 1: Buy crypto
  const buyCryptoStep = useBuyCryptoStep();

  // step 2: Swap funds
  const {
    tokensToBeTransferred,
    tokensToBeBridged,
    step: swapStep,
  } = useSwapFundsStep(onRampChainId, getOnRampRequirementsParams);

  // step 3 & 4: Create Master Safe and transfer funds
  const {
    isMasterSafeCreatedAndFundsTransferred,
    steps: createAndTransferFundsToMasterSafeSteps,
  } = useCreateAndTransferFundsToMasterSafeSteps(
    isSwappingFundsStepCompleted,
    tokensToBeTransferred,
  );

  // Check if all steps are completed to show the setup complete modal or call completion callback
  const [isSetupCompleted, setIsSetupCompleted] = useState(false);
  useEffect(() => {
    if (!isOnRampingStepCompleted) return;
    if (tokensToBeBridged.length > 0 && !isSwappingFundsStepCompleted) return;
    if (
      createAndTransferFundsToMasterSafeSteps.length > 0 &&
      !isMasterSafeCreatedAndFundsTransferred
    ) {
      return;
    }

    // For deposit mode, call the completion callback
    if (mode === 'deposit' && onOnRampCompleted) {
      onOnRampCompleted();
      return;
    }

    // For onboard mode, show the setup complete modal
    setIsSetupCompleted(true);
  }, [
    mode,
    isOnRampingStepCompleted,
    isMasterSafeCreatedAndFundsTransferred,
    isSwappingFundsStepCompleted,
    createAndTransferFundsToMasterSafeSteps.length,
    onOnRampCompleted,
    tokensToBeTransferred.length,
    tokensToBeBridged.length,
  ]);

  return (
    <>
      <TransactionSteps
        steps={[
          buyCryptoStep,
          ...compact([
            tokensToBeBridged.length > 0 ? swapStep : null,
            ...createAndTransferFundsToMasterSafeSteps,
          ]),
        ]}
      />
      {mode === 'onboard' && isSetupCompleted && <AgentSetupCompleteModal />}
    </>
  );
};
