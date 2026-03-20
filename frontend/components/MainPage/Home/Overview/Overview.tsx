import { MainContentContainer, usePageTransitionValue } from '@/components/ui';
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
  const { selectedAgentType } = useServices();
  const displayedAgentType = usePageTransitionValue(selectedAgentType);

  return (
    <MainContentContainer vertical gap={40}>
      <AgentInfo />
      <Performance
        key={displayedAgentType}
        openProfile={openProfile}
        hasVisitedProfile={hasVisitedProfile}
      />
      <Staking key={`staking-${displayedAgentType}`} />
      <Wallet key={`wallet-${displayedAgentType}`} />
    </MainContentContainer>
  );
};
