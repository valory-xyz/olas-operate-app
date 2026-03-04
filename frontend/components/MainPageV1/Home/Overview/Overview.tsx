import { MainContentContainer } from '@/components/ui';

import { AgentInfo } from './AgentInfo';
import { Performance } from './Performance';
import { Staking } from './Staking/Staking';
import { Wallet } from './Wallet';

type OverviewProps = {
  openProfile: () => void;
  hasVisitedProfile?: boolean;
};

export const Overview = ({ openProfile, hasVisitedProfile }: OverviewProps) => (
  <MainContentContainer vertical gap={40}>
    <AgentInfo />
    <Performance
      openProfile={openProfile}
      hasVisitedProfile={hasVisitedProfile}
    />
    <Staking />
    <Wallet />
  </MainContentContainer>
);
