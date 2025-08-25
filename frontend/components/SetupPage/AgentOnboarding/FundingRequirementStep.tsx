import { Flex, Tag, Typography } from 'antd';
import Image from 'next/image';

import { AGENT_CONFIG } from '@/config/agents';
import { AgentType } from '@/constants/agent';
import { COLOR } from '@/constants/colors';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

import { AnimatedContent } from './AnimatedContent';

const { Text, Title } = Typography;

const ExtraSpace = () => (
  <>
    <br />
    <br />
    <br />
  </>
);

type HeaderProps = {
  agentType: AgentType;
  agentName: string;
  category?: string;
  desc?: string;
};
const Header = ({ agentType, agentName, category, desc }: HeaderProps) => (
  <Flex vertical gap={16}>
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
    <Text>{desc}</Text>
  </Flex>
);

type OperatingChainProps = {
  chainName: string;
  chainDisplayName: string;
};
const OperatingChain = ({
  chainName,
  chainDisplayName,
}: OperatingChainProps) => (
  <Flex vertical gap={8}>
    <Text type="secondary">Operating chain</Text>
    <Text className="text-tag">
      <Image
        src={`/chains/${chainName}-chain.png`}
        width={24}
        height={24}
        alt={chainDisplayName}
      />
      {chainDisplayName}
    </Text>
  </Flex>
);

type MinimumStakingRequirementsProps = {
  agentType: AgentType;
};
const MinimumStakingRequirements = ({
  agentType,
}: MinimumStakingRequirementsProps) => {
  const { displayName } = AGENT_CONFIG[agentType];
  return (
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
  );
};

type MinimumFundingRequirementsProps = {
  agentType: AgentType;
};
const MinimumFundingRequirements = ({
  agentType,
}: MinimumFundingRequirementsProps) => {
  const { displayName } = AGENT_CONFIG[agentType];
  return (
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
  );
};

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
      <Flex vertical gap={24} style={{ padding: 20 }}>
        <Header
          agentType={agentType}
          agentName={agentName}
          category={category}
          desc={desc}
        />
        <OperatingChain chainName={name} chainDisplayName={displayName} />
        <MinimumStakingRequirements agentType={agentType} />
        <MinimumFundingRequirements agentType={agentType} />
      </Flex>

      <ExtraSpace />
    </AnimatedContent>
  );
};

/**
 * TODO:
 * - get the minimum staking requirements
 * - get the minimum funding requirements
 * - add some space below
 */

/**
 * - Select your agent list - only those not under construction
 * - Select your agent list - only those not already has account
 */
