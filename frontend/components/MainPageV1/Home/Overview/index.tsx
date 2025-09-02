import { Flex } from 'antd';

import { AgentInfo } from './AgentInfo';
import { Staking } from './Staking';

export const Overview = () => (
  <Flex vertical gap={40}>
    <AgentInfo />
    <Staking />
  </Flex>
);
