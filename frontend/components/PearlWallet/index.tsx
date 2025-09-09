import { useCallback, useState } from 'react';

import { ValueOf } from '@/types/Util';

import { BalancesAndAssets } from './Withdraw/BalancesAndAssets';
import { SelectAmountToWithdraw } from './Withdraw/SelectAmountToWithdraw';

const STEPS = {
  PEARL_WALLET_SCREEN: 'PEARL_WALLET_SCREEN',
  SELECT_AMOUNT: 'SELECT_AMOUNT',
  ENTER_WITHDRAWAL_ADDRESS: 'ENTER_WITHDRAWAL_ADDRESS',
} as const;

/**
 * To display the Pearl Wallet page.
 */
export const PearlWallet = () => {
  const [step, setStep] = useState<ValueOf<typeof STEPS>>(
    STEPS.PEARL_WALLET_SCREEN,
  );

  const handleNext = useCallback(() => {
    if (step === STEPS.PEARL_WALLET_SCREEN) {
      setStep(STEPS.SELECT_AMOUNT);
    } else if (step === STEPS.SELECT_AMOUNT) {
      setStep(STEPS.ENTER_WITHDRAWAL_ADDRESS);
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step === STEPS.SELECT_AMOUNT) {
      setStep(STEPS.PEARL_WALLET_SCREEN);
    } else if (step === STEPS.ENTER_WITHDRAWAL_ADDRESS) {
      setStep(STEPS.SELECT_AMOUNT);
    }
  }, [step]);

  switch (step) {
    case STEPS.PEARL_WALLET_SCREEN:
      return <BalancesAndAssets onWithdraw={handleNext} />;
    case STEPS.SELECT_AMOUNT:
      return (
        <SelectAmountToWithdraw onBack={handleBack} onContinue={handleNext} />
      );
    case STEPS.ENTER_WITHDRAWAL_ADDRESS:
      return 2;
    default:
      throw new Error('Invalid step');
  }
};
