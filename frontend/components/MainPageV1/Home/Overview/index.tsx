import { Flex } from 'antd';

import { AgentInfo } from './AgentInfo';
import { Staking } from './Staking';
import { Wallet } from './Wallet';

export const Overview = () => (
  <Flex vertical gap={40}>
    <AgentInfo />
    <Staking />
    <Wallet />
  </Flex>
);
