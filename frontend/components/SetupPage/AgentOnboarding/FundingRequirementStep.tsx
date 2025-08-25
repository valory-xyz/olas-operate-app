import { Flex } from 'antd';

import { AgentType } from '@/constants/agent';

export const FundingRequirementStep = ({
  agentType,
}: {
  agentType: AgentType;
}) => {
  return <Flex>{agentType}</Flex>;
};

/**
 * TODO:
 * - add header
 * - add desc
 * - get the chain name
 * - get the minimum staking requirements
 * - get the minimum funding requirements
 * - add some space below
 */
