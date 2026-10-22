import { MainContentContainer } from '@/components/ui';
import { useServices } from '@/hooks';

import { AgentChat } from './AgentChat';
import { AgentInfo } from './AgentInfo';
import { Performance } from './Performance';
import { Staking } from './Staking/Staking';
import { Wallet } from './Wallet';

type OverviewProps = {
  openProfile: () => void;
  hasVisitedProfile?: boolean;
};

export const Overview = ({ openProfile, hasVisitedProfile }: OverviewProps) => {
  const { selectedAgentConfig, selectedServiceConfigId } = useServices();
  const { hasStaking, hasPerformance, hasAgentChat } = selectedAgentConfig;

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
      {hasStaking && <Staking />}
      <Wallet />
    </MainContentContainer>
  );
};
