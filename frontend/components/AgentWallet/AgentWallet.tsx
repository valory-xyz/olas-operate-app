import { Flex } from 'antd';
import { useCallback, useMemo } from 'react';

import { MAIN_CONTENT_MAX_WIDTH } from '@/constants';

import { AgentWalletProvider, useAgentWallet } from './AgentWalletProvider';
import { BalancesAndAssets } from './BalancesAndAssets/BalancesAndAssets';
import { FundAgent } from './FundAgent/FundAgent';
import { STEPS } from './types';
import { Withdraw } from './Withdraw/Withdraw';

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
            onLockedFundsWithdrawn={handleNext}
            onFundAgent={onFundAgent}
          />
        );
      case STEPS.WITHDRAW_FROM_AGENT_WALLET:
        return <Withdraw onBack={handleBack} />;
      case STEPS.FUND_AGENT:
        return <FundAgent onBack={handleBack} />;
      default:
        throw new Error('Invalid step');
    }
  }, [step, handleBack, handleNext, onFundAgent]);

  return content;
};

export const AgentWallet = () => (
  <AgentWalletProvider>
    <Flex vertical style={{ width: MAIN_CONTENT_MAX_WIDTH, margin: '0 auto' }}>
      <AgentWalletContent />
    </Flex>
  </AgentWalletProvider>
);
