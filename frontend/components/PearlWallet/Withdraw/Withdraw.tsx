import { Button } from 'antd';
import { useCallback, useState } from 'react';

import { ValueOf } from '@/types/Util';

const STEPS = {
  WITHDRAW_BUTTON: 'WITHDRAW_BUTTON',
  SELECT_AMOUNT: 'SELECT_AMOUNT',
  ENTER_WITHDRAWAL_ADDRESS: 'ENTER_WITHDRAWAL_ADDRESS',
} as const;

export const Withdraw = () => {
  const [step, setStep] = useState<ValueOf<typeof STEPS>>(
    STEPS.WITHDRAW_BUTTON,
  );

  const handleNext = useCallback(() => {
    if (step === STEPS.WITHDRAW_BUTTON) {
      setStep(STEPS.SELECT_AMOUNT);
    } else if (step === STEPS.SELECT_AMOUNT) {
      setStep(STEPS.ENTER_WITHDRAWAL_ADDRESS);
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step === STEPS.WITHDRAW_BUTTON) {
      setStep(STEPS.SELECT_AMOUNT);
    } else if (step === STEPS.SELECT_AMOUNT) {
      setStep(STEPS.ENTER_WITHDRAWAL_ADDRESS);
    }
  }, [step]);

  switch (step) {
    case STEPS.WITHDRAW_BUTTON:
      return <Button onClick={handleNext}>Withdraw</Button>;
    case STEPS.SELECT_AMOUNT:
      return 2;
    case STEPS.ENTER_WITHDRAWAL_ADDRESS:
      return 2;
    default:
      throw new Error('Invalid step');
  }
};
