import { isNil } from 'lodash';

import { MainContentContainer } from '@/components/ui';
import { useServices } from '@/hooks';
import { isInStakingMode, isStakingAvailable } from '@/utils/stakingProgram';

import { AgentChat } from './AgentChat';
import { AgentInfo } from './AgentInfo';
import { Performance } from './Performance';
import { NotStaked } from './Staking/NotStaked';
import { Staking } from './Staking/Staking';
import { Wallet } from './Wallet';

type OverviewProps = {
  openProfile: () => void;
  hasVisitedProfile?: boolean;
};

export const Overview = ({ openProfile, hasVisitedProfile }: OverviewProps) => {
  const { selectedAgentConfig, selectedServiceConfigId, selectedService } =
    useServices();
  const { hasPerformance, hasAgentChat, evmHomeChainId } = selectedAgentConfig;
  const canStake = isStakingAvailable(selectedAgentConfig, evmHomeChainId);
  const isStaked = isInStakingMode(
    selectedAgentConfig,
    evmHomeChainId,
    selectedService,
  );

  const renderStaking = () => {
    if (!canStake || isNil(isStaked)) return null;
    return isStaked ? <Staking /> : <NotStaked />;
  };

  if (hasAgentChat) {
    return (
      <MainContentContainer vertical>
        <AgentChat key={selectedServiceConfigId} />
      </MainContentContainer>
    );
  }

  return (
    <MainContentContainer vertical gap={40}>
      <AgentInfo />
      {hasPerformance && (
        <Performance
          openProfile={openProfile}
          hasVisitedProfile={hasVisitedProfile}
        />
      )}
      {renderStaking()}
      <Wallet />
    </MainContentContainer>
  );
};
