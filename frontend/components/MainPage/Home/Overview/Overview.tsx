import { MainContentContainer } from '@/components/ui';
import { useServices, useStakingProgram } from '@/hooks';
import { isNoStakingProgram, isStakingAvailable } from '@/utils/stakingProgram';

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
  const { selectedAgentConfig, selectedServiceConfigId } = useServices();
  const { selectedStakingProgramId } = useStakingProgram();
  const { hasPerformance, hasAgentChat, evmHomeChainId } = selectedAgentConfig;
  const hasStaking = isStakingAvailable(selectedAgentConfig, evmHomeChainId);

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
      {hasStaking &&
        (isNoStakingProgram(selectedStakingProgramId) ? (
          <NotStaked />
        ) : (
          <Staking />
        ))}
      <Wallet />
    </MainContentContainer>
  );
};
