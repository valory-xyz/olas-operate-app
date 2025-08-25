import { Flex, Tag, Typography } from 'antd';
import Image from 'next/image';

import { AGENT_CONFIG } from '@/config/agents';
import { AgentType } from '@/constants/agent';
import { COLOR } from '@/constants/colors';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

import { AnimatedContent } from './AnimatedContent';

const { Text, Title } = Typography;

type HeaderProps = {
  agentType: AgentType;
  agentName: string;
  category?: string;
};
const Header = ({ agentType, agentName, category }: HeaderProps) => (
  <Flex justify="space-between" align="center">
    <Flex align="center" gap={8}>
      <Image
        src={`/agent-${agentType}-icon.png`}
        width={36}
        height={36}
        alt={agentName}
        style={{ borderRadius: 8, border: `1px solid ${COLOR.GRAY_3}` }}
      />
      <Title level={5} className="m-0">
        {agentName}
      </Title>
    </Flex>

    {category && <Tag bordered={false}>{category}</Tag>}
  </Flex>
);

type FundingRequirementStepProps = {
  agentType: AgentType;
  desc?: string;
};

export const FundingRequirementStep = ({
  agentType,
  desc,
}: FundingRequirementStepProps) => {
  const {
    displayName: agentName,
    middlewareHomeChainId,
    category,
  } = AGENT_CONFIG[agentType];
  const { name, displayName } = asEvmChainDetails(middlewareHomeChainId);

  return (
    <AnimatedContent>
      <Flex vertical gap={16} style={{ padding: 20 }}>
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={8}>
            <Image
              src={`/agent-${agentType}-icon.png`}
              width={36}
              height={36}
              alt={agentName}
              style={{ borderRadius: 8, border: `1px solid ${COLOR.GRAY_3}` }}
            />
            <Title level={5} className="m-0">
              {agentName}
            </Title>
          </Flex>

          <Tag bordered={false}>{category}</Tag>
        </Flex>

        <Flex vertical gap={24}>
          <Text>{desc}</Text>

          <Flex vertical gap={8}>
            <Text type="secondary">Operating chain</Text>
            <Text className="text-tag">
              <Image
                src={`/chains/${name}-chain.png`}
                width={24}
                height={24}
                alt={displayName}
              />
              {displayName}
            </Text>
          </Flex>

          <Flex vertical gap={8}>
            <Text type="secondary">Minimum staking requirement</Text>
            <Text className="text-tag">
              <Image
                src={`/tokens/olas-icon.png`}
                // src={`/tokens/${name}-token.png`}
                width={24}
                height={24}
                alt={displayName}
              />
              40 OLAS (~$11.32)
            </Text>
          </Flex>

          <Flex vertical gap={8}>
            <Text type="secondary">Minimum funding requirement</Text>
            <Text className="text-tag">
              <Image
                src={`/tokens/wxdai-icon.png`}
                // src={`/tokens/${name}-token.png`}
                width={24}
                height={24}
                alt={displayName}
              />
              11 XDAI (~$11.48)
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </AnimatedContent>
  );
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

/**
 * - Select your agent list - only those not under construction
 * - Select your agent list - only those not already has account
 */
