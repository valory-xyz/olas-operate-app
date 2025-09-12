import { useCallback, useMemo } from 'react';

import { PearlWalletProvider, usePearlWallet } from './PearlWalletContext';
import { BalancesAndAssets } from './Withdraw/BalancesAndAssets/BalancesAndAssets';
import { EnterWithdrawalAddress } from './Withdraw/EnterWithdrawalAddress/EnterWithdrawalAddress';
import { SelectAmountToWithdraw } from './Withdraw/SelectAmountToWithdraw/SelectAmountToWithdraw';
import { STEPS } from './Withdraw/types';

/**
 * To display the Pearl Wallet page.
 */
const PearlWalletContent = () => {
  const { walletStep: step, updateStep } = usePearlWallet();

  const handleNext = useCallback(() => {
    if (step === STEPS.PEARL_WALLET_SCREEN) {
      updateStep(STEPS.SELECT_AMOUNT);
    } else if (step === STEPS.SELECT_AMOUNT) {
      updateStep(STEPS.ENTER_WITHDRAWAL_ADDRESS);
    }
  }, [step, updateStep]);

  const handleBack = useCallback(() => {
    if (step === STEPS.SELECT_AMOUNT) {
      updateStep(STEPS.PEARL_WALLET_SCREEN);
    } else if (step === STEPS.ENTER_WITHDRAWAL_ADDRESS) {
      updateStep(STEPS.SELECT_AMOUNT);
    }
  }, [step, updateStep]);

  const content = useMemo(() => {
    switch (step) {
      case STEPS.PEARL_WALLET_SCREEN:
        return <BalancesAndAssets onWithdraw={handleNext} />;
      case STEPS.SELECT_AMOUNT:
        return (
          <SelectAmountToWithdraw onBack={handleBack} onContinue={handleNext} />
        );
      case STEPS.ENTER_WITHDRAWAL_ADDRESS:
        return <EnterWithdrawalAddress onBack={handleBack} />;
      default:
        throw new Error('Invalid step');
    }
  }, [step, handleBack, handleNext]);

  return content;
};

export const PearlWallet = () => (
  <PearlWalletProvider>
    <PearlWalletContent />
  </PearlWalletProvider>
);
