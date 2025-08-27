import { Flex, Tag, Typography } from 'antd';
import { formatUnits } from 'ethers/lib/utils';
import { isNil } from 'lodash';
import Image from 'next/image';
import { useMemo } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { CHAIN_CONFIG } from '@/config/chains';
import {
  DEFAULT_STAKING_PROGRAM_IDS,
  STAKING_PROGRAMS,
} from '@/config/stakingPrograms';
import { getNativeTokenSymbol } from '@/config/tokens';
import { AgentType } from '@/constants/agent';
import { EvmChainId } from '@/constants/chains';
import { COLOR } from '@/constants/colors';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import {
  TokenSymbol,
  TokenSymbolConfigMap,
  TokenSymbolMap,
} from '@/constants/token';
import { asEvmChainDetails, asEvmChainId } from '@/utils/middlewareHelpers';

import { AnimatedContent } from './AnimatedContent';

const { Text, Title } = Typography;

type ChainTokenSymbol = {
  [chainId in EvmChainId]: {
    [tokenSymbol: string]: number;
  };
};

const useFundingRequirements = (agentType: AgentType) => {
  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === agentType,
  );
  const { additionalRequirements, evmHomeChainId } = AGENT_CONFIG[agentType];
  const stakingProgramId = DEFAULT_STAKING_PROGRAM_IDS[evmHomeChainId];

  return useMemo<ChainTokenSymbol>(() => {
    if (isNil(serviceTemplate)) return {} as ChainTokenSymbol;

    const results = {} as ChainTokenSymbol;

    Object.entries(serviceTemplate.configurations).forEach(
      ([middlewareChain, config]) => {
        const evmChainId = asEvmChainId(middlewareChain);

        if (!stakingProgramId) return;

        // Gas requirements
        const gasEstimate = config.monthly_gas_estimate;
        const monthlyGasEstimate = Number(formatUnits(`${gasEstimate}`, 18));
        const nativeTokenSymbol = getNativeTokenSymbol(evmChainId);

        // OLAS staking requirements
        const minimumStakedAmountRequired =
          STAKING_PROGRAMS[evmChainId]?.[stakingProgramId]
            ?.stakingRequirements?.[TokenSymbolMap.OLAS] || 0;

        // Additional tokens requirements
        const additionalTokens = additionalRequirements?.[evmChainId] ?? {};

        results[evmChainId] = {
          [TokenSymbolMap.OLAS]: minimumStakedAmountRequired,
          [nativeTokenSymbol]: monthlyGasEstimate,
          ...additionalTokens,
        };
      },
    );

    return results;
  }, [serviceTemplate, stakingProgramId, additionalRequirements]);
};

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
        width={20}
        height={20}
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
  const { evmHomeChainId } = AGENT_CONFIG[agentType];
  const tokens = useFundingRequirements(agentType);
  const olasAmount = tokens?.[evmHomeChainId]?.[TokenSymbolMap.OLAS] || 0;

  return (
    <Flex vertical gap={8}>
      <Text type="secondary">Minimum staking requirement</Text>
      <Flex vertical className="text-tag">
        <Flex gap={8} align="flex-start">
          <Image
            src="/tokens/olas-icon.png"
            alt="OLAS token for staking"
            width={18}
            height={20}
          />
          <Text className="leading-normal">
            {olasAmount} {TokenSymbolMap.OLAS}
          </Text>
        </Flex>
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
  const { evmHomeChainId } = AGENT_CONFIG[agentType];
  const { safeCreationThreshold, nativeToken } = CHAIN_CONFIG[evmHomeChainId];
  const tokens = useFundingRequirements(agentType);

  const allTokens = Object.entries(tokens[evmHomeChainId] || {})
    .map(([token, minAmount]) => {
      const amount = (() => {
        // For native token, add amount for safe creation
        if (token === nativeToken.symbol) {
          return minAmount + safeCreationThreshold;
        }
        return minAmount;
      })();

      const icon = (() => {
        if (token === 'XDAI') return '/tokens/wxdai-icon.png';
        return TokenSymbolConfigMap[token as TokenSymbol]?.image as string;
      })();

      return { token, amount, icon };
    })
    // filter out OLAS as it's shown in staking requirements
    .filter(({ token }) => token !== TokenSymbolMap.OLAS);

  if (allTokens.length === 0) {
    return (
      <Flex vertical gap={8}>
        <Text type="secondary">Minimum funding requirement</Text>
        <Text className="text-tag">No funding required</Text>
      </Flex>
    );
  }

  return (
    <Flex vertical gap={8}>
      <Text type="secondary">Minimum funding requirement</Text>
      <Flex vertical className="text-tag" gap={12}>
        {allTokens.map(({ token, amount, icon }) => (
          <Flex key={token} gap={8} align="flex-start">
            <Image src={icon} alt={`${token} token`} width={20} height={20} />
            <Text className="leading-normal">
              {amount} {token}
            </Text>
          </Flex>
        ))}
      </Flex>
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
      <Flex vertical gap={24} style={{ padding: 20, marginBottom: 48 }}>
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
    </AnimatedContent>
  );
};
