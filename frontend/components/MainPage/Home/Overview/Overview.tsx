import { MainContentContainer } from '@/components/ui';
import { useServices } from '@/hooks';

import { AgentInfo } from './AgentInfo';
import { Performance } from './Performance';
import { Staking } from './Staking/Staking';
import { Wallet } from './Wallet';

type OverviewProps = {
  openProfile: () => void;
  hasVisitedProfile?: boolean;
};

export const Overview = ({ openProfile, hasVisitedProfile }: OverviewProps) => {
  const { selectedAgentConfig } = useServices();
  const { hasStaking, hasPerformance } = selectedAgentConfig;

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
