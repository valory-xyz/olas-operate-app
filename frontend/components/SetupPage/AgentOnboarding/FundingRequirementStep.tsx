import { Flex, Tag, Typography } from 'antd';
import Image from 'next/image';
import { TbCreditCardFilled } from 'react-icons/tb';

import { IntroductionAnimatedContainer } from '@/components/AgentIntroduction';
import { Alert } from '@/components/ui';
import { AGENT_CONFIG } from '@/config/agents';
import {
  TokenSymbol,
  TokenSymbolConfigMap,
  TokenSymbolMap,
} from '@/config/tokens';
import { AgentType, COLOR } from '@/constants';
import { useInitialFundingRequirements } from '@/hooks';
import { asEvmChainDetails } from '@/utils';

const { Text, Title } = Typography;

const UnderConstructionAlert = () => (
  <Alert
    type="warning"
    fullWidth={false}
    showIcon
    className="rounded-12"
    message={
      <Flex justify="space-between" gap={4} vertical>
        <Text className="text-sm font-weight-500">Agent Under Development</Text>
        <Text className="text-sm">
          The agent is unavailable due to technical issues for an unspecified
          time.
        </Text>
      </Flex>
    }
  />
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
    <Text className="text-neutral-secondary">{desc}</Text>
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
    <Text className="text-neutral-tertiary">Operating chain</Text>
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
  const tokens = useInitialFundingRequirements(agentType);
  const olasAmount = tokens?.[evmHomeChainId]?.[TokenSymbolMap.OLAS] || 0;

  return (
    <Flex vertical gap={8}>
      <Text className="text-neutral-tertiary">Minimum staking requirement</Text>
      <Flex vertical className="text-tag">
        <Flex gap={8} align="flex-start">
          <Image
            src="/tokens/olas-icon.png"
            alt="OLAS token for staking"
            width={20}
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
  const tokens = useInitialFundingRequirements(agentType);

  const allTokens = Object.entries(tokens[evmHomeChainId] || {})
    .map(([token, amount]) => {
      const icon = TokenSymbolConfigMap[token as TokenSymbol]?.image as string;
      return { token, amount, icon };
    })
    // filter out OLAS as it's shown in staking requirements above.
    .filter(({ token }) => token !== TokenSymbolMap.OLAS);

  if (allTokens.length === 0) {
    return (
      <Flex vertical gap={8}>
        <Text className="text-neutral-tertiary">
          Minimum funding requirement
        </Text>
        <Text className="text-tag">No funding required</Text>
      </Flex>
    );
  }

  return (
    <Flex vertical gap={8}>
      <Text className="text-neutral-tertiary">Minimum funding requirement</Text>
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

const YouCanCoverAllRequirements = () => (
  <Flex gap={8} align="center">
    <TbCreditCardFilled size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
    <Text className="text-neutral-tertiary text-sm">
      You can cover all requirements instantly with your card.
    </Text>
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
    isUnderConstruction,
  } = AGENT_CONFIG[agentType];
  const { name, displayName } = asEvmChainDetails(middlewareHomeChainId);

  return (
    <IntroductionAnimatedContainer>
      <Flex vertical gap={24} style={{ padding: 20, marginBottom: 12 }}>
        <Header
          agentType={agentType}
          agentName={agentName}
          category={category}
          desc={desc}
        />
        {isUnderConstruction ? (
          <div style={{ marginBottom: 300 }}>
            <UnderConstructionAlert />
          </div>
        ) : (
          <>
            <OperatingChain chainName={name} chainDisplayName={displayName} />
            <MinimumStakingRequirements agentType={agentType} />
            <MinimumFundingRequirements agentType={agentType} />
            <YouCanCoverAllRequirements />
          </>
        )}
      </Flex>
    </IntroductionAnimatedContainer>
  );
};
