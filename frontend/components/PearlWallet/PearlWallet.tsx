import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useUnmount } from 'usehooks-ts';

import { isRunStarted } from '@/components/FundingFlow/utils';
import { MainContentContainer } from '@/components/ui';
import { MAIN_CONTENT_MAX_WIDTH } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useFundingRun } from '@/hooks';

import { PearlDeposit } from '../PearlDeposit';
import { STEPS } from './types';
import { BalancesAndAssets } from './Withdraw/BalancesAndAssets/BalancesAndAssets';
import { EnterWithdrawalAddress } from './Withdraw/EnterWithdrawalAddress/EnterWithdrawalAddress';
import { SelectAmountToWithdraw } from './Withdraw/SelectAmountToWithdraw';

/**
 * To display the Pearl Wallet page.
 */
const PearlWalletContent = () => {
  const { walletStep: step, updateStep } = usePearlWallet();
  const { activeRun } = useFundingRun();

  // Coming back mid-transfer (e.g. via the sidebar) shows the deposit's
  // progress. Once per visit, so Back from a failed run still reaches the wallet.
  const hasStartedDeposit =
    activeRun?.mode === 'deposit' && isRunStarted(activeRun);
  const hasResumedDeposit = useRef(false);
  useEffect(() => {
    if (!hasStartedDeposit || hasResumedDeposit.current) return;
    hasResumedDeposit.current = true;
    if (step === STEPS.PEARL_WALLET_SCREEN) updateStep(STEPS.DEPOSIT);
  }, [hasStartedDeposit, step, updateStep]);

  const handleNext = useCallback(() => {
    switch (step) {
      case STEPS.PEARL_WALLET_SCREEN:
        updateStep(STEPS.SELECT_AMOUNT_TO_WITHDRAW);
        break;
      case STEPS.SELECT_AMOUNT_TO_WITHDRAW:
        updateStep(STEPS.ENTER_WITHDRAWAL_ADDRESS);
        break;
      default:
        break;
    }
  }, [step, updateStep]);

  const handleBack = useCallback(() => {
    switch (step) {
      case STEPS.SELECT_AMOUNT_TO_WITHDRAW:
      case STEPS.DEPOSIT:
        updateStep(STEPS.PEARL_WALLET_SCREEN);
        break;
      case STEPS.ENTER_WITHDRAWAL_ADDRESS:
        updateStep(STEPS.SELECT_AMOUNT_TO_WITHDRAW);
        break;
      default:
        break;
    }
  }, [step, updateStep]);

  const content = useMemo(() => {
    switch (step) {
      case STEPS.PEARL_WALLET_SCREEN:
        return (
          <BalancesAndAssets
            onWithdraw={handleNext}
            onDeposit={() => updateStep(STEPS.DEPOSIT)}
          />
        );
      case STEPS.SELECT_AMOUNT_TO_WITHDRAW:
        return (
          <SelectAmountToWithdraw onBack={handleBack} onContinue={handleNext} />
        );
      case STEPS.ENTER_WITHDRAWAL_ADDRESS:
        return <EnterWithdrawalAddress onBack={handleBack} />;
      case STEPS.DEPOSIT:
        return <PearlDeposit onBack={handleBack} />;
      default:
        throw new Error('Invalid page');
    }
  }, [step, handleNext, handleBack, updateStep]);

  return content;
};

export const PearlWallet = () => {
  const { walletStep: step, updateStep } = usePearlWallet();

  useUnmount(() => {
    updateStep(STEPS.PEARL_WALLET_SCREEN);
  });

  return (
    <MainContentContainer
      vertical
      $width={step === STEPS.DEPOSIT ? undefined : MAIN_CONTENT_MAX_WIDTH}
    >
      <PearlWalletContent />
    </MainContentContainer>
  );
};
