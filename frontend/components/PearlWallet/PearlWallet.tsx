import { Flex } from 'antd';
import { useCallback, useMemo } from 'react';

import { MAIN_CONTENT_MAX_WIDTH } from '@/constants/width';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { Deposit } from '../PearlDeposit/Deposit';
import { SelectPaymentMethod } from '../PearlDeposit/SelectPaymentMethod/SelectPaymentMethod';
import { STEPS } from './types';
import { BalancesAndAssets } from './Withdraw/BalancesAndAssets/BalancesAndAssets';
import { EnterWithdrawalAddress } from './Withdraw/EnterWithdrawalAddress/EnterWithdrawalAddress';
import { SelectAmountToWithdraw } from './Withdraw/SelectAmountToWithdraw';

/**
 * To display the Pearl Wallet page.
 */
const PearlWalletContent = () => {
  const { walletStep: step, updateStep } = usePearlWallet();

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
      case STEPS.SELECT_PAYMENT_METHOD:
        updateStep(STEPS.DEPOSIT);
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
        return <Deposit onBack={handleBack} />;
      case STEPS.SELECT_PAYMENT_METHOD:
        return <SelectPaymentMethod onBack={handleBack} />;
      default:
        throw new Error('Invalid page');
    }
  }, [step, handleNext, handleBack, updateStep]);

  return content;
};

export const PearlWallet = () => {
  const { pageState } = usePageState();

  return (
    <Flex
      vertical
      style={{
        width:
          pageState === Pages.PearlWalletSelectPaymentMethod
            ? undefined
            : MAIN_CONTENT_MAX_WIDTH,
        margin: '0 auto',
      }}
    >
      <PearlWalletContent />
    </Flex>
  );
};
