import { useState } from 'react';

import { ValueOf } from '@/types';

import { Deposit } from './Deposit/Deposit';
import { SelectPaymentMethod } from './SelectPaymentMethod/SelectPaymentMethod';

const PEARL_DEPOSIT_STEPS = {
  DEPOSIT: 'DEPOSIT',
  SELECT_PAYMENT_METHOD: 'SELECT_PAYMENT_METHOD',
} as const;

type PearlDepositProps = {
  onBack: () => void;
};

export const PearlDeposit = ({ onBack }: PearlDepositProps) => {
  const [step, setStep] = useState<ValueOf<typeof PEARL_DEPOSIT_STEPS>>(
    PEARL_DEPOSIT_STEPS.DEPOSIT,
  );

  switch (step) {
    case PEARL_DEPOSIT_STEPS.DEPOSIT:
      return (
        <Deposit
          onBack={onBack}
          onContinue={() => setStep(PEARL_DEPOSIT_STEPS.SELECT_PAYMENT_METHOD)}
        />
      );
    case PEARL_DEPOSIT_STEPS.SELECT_PAYMENT_METHOD:
      return (
        <SelectPaymentMethod
          onBack={() => setStep(PEARL_DEPOSIT_STEPS.DEPOSIT)}
        />
      );
    default:
      throw new Error('Invalid step');
  }
};
