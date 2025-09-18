import { useCallback, useMemo } from 'react';

import { YourWalletPage } from '../YourWalletPage';
import { AgentWalletProvider, usePearlWallet } from './AgentWalletContext';
import { BalancesAndAssets } from './Withdraw/BalancesAndAssets/BalancesAndAssets';
import { EnterWithdrawalAddress } from './Withdraw/EnterWithdrawalAddress/EnterWithdrawalAddress';
import { SelectAmountToWithdraw } from './Withdraw/SelectAmountToWithdraw/SelectAmountToWithdraw';
import { STEPS } from './Withdraw/types';

/**
 * To display the Agent Wallet page.
 */
const AgentWalletContent = () => {
  const { walletStep: step, updateStep } = usePearlWallet();

  const handleNext = useCallback(() => {
    switch (step) {
      case STEPS.AGENT_WALLET_SCREEN:
        updateStep(STEPS.SELECT_AMOUNT);
        break;
      case STEPS.SELECT_AMOUNT:
        updateStep(STEPS.ENTER_WITHDRAWAL_ADDRESS);
        break;
      default:
        break;
    }
  }, [step, updateStep]);

  const handleBack = useCallback(() => {
    switch (step) {
      case STEPS.SELECT_AMOUNT:
        updateStep(STEPS.AGENT_WALLET_SCREEN);
        break;
      case STEPS.ENTER_WITHDRAWAL_ADDRESS:
        updateStep(STEPS.SELECT_AMOUNT);
        break;
      default:
        break;
    }
  }, [step, updateStep]);

  const content = useMemo(() => {
    switch (step) {
      case STEPS.AGENT_WALLET_SCREEN:
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

export const AgentWallet = () => (
  <AgentWalletProvider>
    <AgentWalletContent />
    <br />
    <YourWalletPage />
  </AgentWalletProvider>
);
