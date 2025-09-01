import { Flex } from 'antd';

import { AgentInfo } from './AgentInfo';

export const Overview = () => {
  return (
    <Flex vertical gap={40}>
      <AgentInfo />
    </Flex>
  );
};
