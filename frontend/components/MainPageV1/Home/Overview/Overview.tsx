import { Flex } from 'antd';
import styled from 'styled-components';

import { AgentInfo } from './AgentInfo';
import { Performance } from './Performance';
import { Staking } from './Staking/Staking';
import { Wallet } from './Wallet';

const Container = styled(Flex)`
  max-width: 744px;
  width: 100%;
  margin: 0 auto;
`;

type OverviewProps = {
  openProfile: () => void;
  hasVisitedProfile?: boolean;
};

export const Overview = ({ openProfile, hasVisitedProfile }: OverviewProps) => (
  <Container vertical gap={40}>
    <AgentInfo />
    <Performance
      openProfile={openProfile}
      hasVisitedProfile={hasVisitedProfile}
    />
    <Staking />
    <Wallet />
  </Container>
);
