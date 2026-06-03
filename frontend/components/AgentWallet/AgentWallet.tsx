import { useCallback, useMemo } from 'react';

import { MainContentContainer } from '@/components/ui';

import { AgentWalletProvider, useAgentWallet } from './AgentWalletProvider';
import { BalancesAndAssets } from './BalancesAndAssets/BalancesAndAssets';
import { FundAgent } from './FundAgent/FundAgent';
import { PartialWithdrawScreen } from './PartialWithdraw';
import { STEPS } from './types';
import { Withdraw } from './Withdraw/Withdraw';

/**
 * To display the Agent Wallet page.
 */
const AgentWalletContent = () => {
  const { walletStep: step, updateStep } = useAgentWallet();

  const handleDecommissionConfirmed = useCallback(() => {
    updateStep(STEPS.WITHDRAW_FROM_AGENT_WALLET);
  }, [updateStep]);

  const handlePartialWithdraw = useCallback(() => {
    updateStep(STEPS.PARTIAL_WITHDRAW_FROM_AGENT_WALLET);
  }, [updateStep]);

  const handleBack = useCallback(() => {
    switch (step) {
      case STEPS.WITHDRAW_FROM_AGENT_WALLET:
      case STEPS.PARTIAL_WITHDRAW_FROM_AGENT_WALLET:
      case STEPS.FUND_AGENT:
        updateStep(STEPS.AGENT_WALLET_SCREEN);
        break;
      default:
        break;
    }
  }, [step, updateStep]);

  const onFundAgent = useCallback(
    () => updateStep(STEPS.FUND_AGENT),
    [updateStep],
  );

  const content = useMemo(() => {
    switch (step) {
      case STEPS.AGENT_WALLET_SCREEN:
        return (
          <BalancesAndAssets
            onPartialWithdraw={handlePartialWithdraw}
            onDecommissionConfirmed={handleDecommissionConfirmed}
            onFundAgent={onFundAgent}
          />
        );
      case STEPS.WITHDRAW_FROM_AGENT_WALLET:
        return <Withdraw onBack={handleBack} />;
      case STEPS.PARTIAL_WITHDRAW_FROM_AGENT_WALLET:
        return <PartialWithdrawScreen onBack={handleBack} />;
      case STEPS.FUND_AGENT:
        return <FundAgent onBack={handleBack} />;
      default:
        throw new Error('Invalid step');
    }
  }, [
    step,
    handleBack,
    handleDecommissionConfirmed,
    handlePartialWithdraw,
    onFundAgent,
  ]);

  return content;
};

export const AgentWallet = () => (
  <AgentWalletProvider>
    <MainContentContainer vertical>
      <AgentWalletContent />
    </MainContentContainer>
  </AgentWalletProvider>
);
