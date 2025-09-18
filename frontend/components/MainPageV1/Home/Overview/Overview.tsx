import { Flex } from 'antd';
import styled from 'styled-components';

import { AgentInfo } from './AgentInfo';
import { Staking } from './Staking';

const Container = styled(Flex)`
  max-width: 744px;
  width: 100%;
  margin: 0 auto;
`;

export const Overview = () => (
  <Container vertical gap={40}>
    <AgentInfo />
    <Staking />
  </Container>
);
