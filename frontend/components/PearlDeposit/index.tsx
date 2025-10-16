import { useState } from 'react';

import { ValueOf } from '@/types';

import { DepositScreen } from './Deposit/Deposit';
import { SelectPaymentMethod } from './SelectPaymentMethod/SelectPaymentMethod';

const DEPOSIT_STEPS = {
  DEPOSIT: 'DEPOSIT',
  SELECT_PAYMENT_METHOD: 'SELECT_PAYMENT_METHOD',
} as const;

type DepositProps = {
  onBack: () => void;
};

export const PearlDeposit = ({ onBack }: DepositProps) => {
  const [step, setStep] = useState<ValueOf<typeof DEPOSIT_STEPS>>(
    DEPOSIT_STEPS.DEPOSIT,
  );

  switch (step) {
    case DEPOSIT_STEPS.DEPOSIT:
      return (
        <DepositScreen
          onBack={onBack}
          onContinue={() => setStep(DEPOSIT_STEPS.SELECT_PAYMENT_METHOD)}
        />
      );
    case DEPOSIT_STEPS.SELECT_PAYMENT_METHOD:
      return (
        <SelectPaymentMethod onBack={() => setStep(DEPOSIT_STEPS.DEPOSIT)} />
      );
    default:
      throw new Error('Invalid step');
  }
};
