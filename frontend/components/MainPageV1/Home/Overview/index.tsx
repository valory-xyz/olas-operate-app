import { Flex } from 'antd';

import { AgentInfo } from './AgentInto';

export const Overview = () => {
  return (
    <Flex vertical gap={40}>
      <AgentInfo />
    </Flex>
  );
};
