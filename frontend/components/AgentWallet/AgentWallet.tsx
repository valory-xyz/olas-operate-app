import { useCallback, useMemo } from 'react';

import { AgentWalletProvider, useAgentWallet } from './AgentWalletContext';
import { BalancesAndAssets } from './Withdraw/BalancesAndAssets/BalancesAndAssets';
import { EnterWithdrawalAddress } from './Withdraw/EnterWithdrawalAddress/EnterWithdrawalAddress';
import { STEPS } from './Withdraw/types';

/**
 * To display the Agent Wallet page.
 */
const AgentWalletContent = () => {
  const { walletStep: step, updateStep } = useAgentWallet();

  const handleNext = useCallback(() => {
    switch (step) {
      case STEPS.AGENT_WALLET_SCREEN:
        updateStep(STEPS.WITHDRAW_FROM_AGENT_WALLET);
        break;
      default:
        break;
    }
  }, [step, updateStep]);

  const handleBack = useCallback(() => {
    switch (step) {
      case STEPS.WITHDRAW_FROM_AGENT_WALLET:
        updateStep(STEPS.AGENT_WALLET_SCREEN);
        break;
      default:
        break;
    }
  }, [step, updateStep]);

  const content = useMemo(() => {
    switch (step) {
      case STEPS.AGENT_WALLET_SCREEN:
        return <BalancesAndAssets onWithdraw={handleNext} />;
      case STEPS.WITHDRAW_FROM_AGENT_WALLET:
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
  </AgentWalletProvider>
);
