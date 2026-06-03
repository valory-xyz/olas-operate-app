import { useQueryClient } from '@tanstack/react-query';
import compact from 'lodash/compact';
import { useEffect, useState } from 'react';

import { AgentSetupCompleteModal } from '@/components/ui/AgentSetupCompleteModal';
import { InsufficientSignerGasModal } from '@/components/ui/InsufficientSignerGasModal';
import { TransactionSteps } from '@/components/ui/TransactionSteps';
import { EvmChainId } from '@/constants/chains';
import { PAGES } from '@/constants/pages';
import { REACT_QUERY_KEYS } from '@/constants/reactQueryKeys';
import { useInsufficientGasModal } from '@/hooks/useInsufficientGasModal';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { usePageState } from '@/hooks/usePageState';

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

  const { goto } = usePageState();
  const queryClient = useQueryClient();
  const [isGasModalDismissed, setIsGasModalDismissed] = useState(false);

  // step 2: Swap funds
  const {
    tokensToBeTransferred,
    tokensToBeBridged,
    step: swapStep,
    quoteId,
    isBridgeExecuteError,
    bridgeExecuteError,
  } = useSwapFundsStep(onRampChainId, getOnRampRequirementsParams);

  const gasModalProps = useInsufficientGasModal({
    isError: isBridgeExecuteError && !isGasModalDismissed,
    error: bridgeExecuteError,
    caseType: 'bridge',
    onFund: (gasError) => {
      goto(PAGES.FundPearlWallet, {
        prefillAmountWei: gasError.prefill_amount_wei,
      });
    },
    onClose: () => setIsGasModalDismissed(true),
    resetMutation: () => {
      if (!quoteId) return;
      queryClient.removeQueries({
        queryKey: REACT_QUERY_KEYS.BRIDGE_EXECUTE_KEY(quoteId),
      });
    },
  });

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
      {
        // TODO: move this out of steps and handle in parent component
        // same as we do it with for depositing with showOnRampCompleteModal
        mode === 'onboard' && isSetupCompleted && <AgentSetupCompleteModal />
      }
      {gasModalProps && <InsufficientSignerGasModal {...gasModalProps} />}
    </>
  );
};
