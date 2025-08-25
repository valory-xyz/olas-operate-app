import { Flex, Tag, Typography } from 'antd';
import { entries } from 'lodash';
import Image from 'next/image';

import { AGENT_CONFIG } from '@/config/agents';
import {
  DEFAULT_STAKING_PROGRAM_IDS,
  STAKING_PROGRAMS,
} from '@/config/stakingPrograms';
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
  const { evmHomeChainId, middlewareHomeChainId } = AGENT_CONFIG[agentType];
  const stakingProgramId = DEFAULT_STAKING_PROGRAM_IDS[evmHomeChainId];
  const stakingRequirements =
    STAKING_PROGRAMS[evmHomeChainId][stakingProgramId].stakingRequirements;
  // console.log('abcd', abcd);
  // const stakingRequirements = SERVICE_TEMPLATES.find(
  //   (template) => template.home_chain === middlewareHomeChainId,
  // )?.configurations?.[middlewareHomeChainId]?.staking_program_id;

  return (
    <Flex vertical gap={8}>
      <Text type="secondary">Minimum staking requirement</Text>
      <Flex vertical className="text-tag">
        {entries(stakingRequirements).map(([token, amount]) => (
          <Flex key={token} gap={8} align="flex-start">
            <Image
              src={`/tokens/${token.toLowerCase()}-icon.png`}
              alt={`${token} token for staking`}
              width={24}
              height={24}
            />
            <Text>
              {amount} {token}
            </Text>

            {/* TODO */}
            <Text type="secondary" className="text-sm">
              (~${(amount * 0.283).toFixed(2)})
            </Text>
          </Flex>
        ))}
      </Flex>
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
 */

/**
 * - Select your agent list - only those not already has account
 */
