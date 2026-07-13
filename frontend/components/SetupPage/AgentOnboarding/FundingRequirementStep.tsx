import { Flex, Select, Tag, Typography } from 'antd';
import Image from 'next/image';
import { useMemo } from 'react';
import { TbCreditCardFilled } from 'react-icons/tb';

import { IntroductionAnimatedContainer } from '@/components/AgentIntroduction';
import { Alert } from '@/components/ui';
import { AGENT_CONFIG } from '@/config/agents';
import {
  TokenSymbol,
  TokenSymbolConfigMap,
  TokenSymbolMap,
} from '@/config/tokens';
import {
  AgentMap,
  AgentType,
  CHAIN_IMAGE_MAP,
  COLOR,
  EvmChainId,
  EvmChainIdMap,
  EvmChainName,
  POLYMARKET_DEPOSIT_WALLET_MIGRATION_URL,
  UNICODE_SYMBOLS,
  X_DEVELOPER_CONSOLE_URL,
} from '@/constants';
import { useInitialFundingRequirements, useServices } from '@/hooks';
import { asEvmChainDetails, asEvmChainId, matchesAgentConfig } from '@/utils';

/** Chains offered for Connect, in display order. */
const CONNECT_CHAIN_OPTIONS: EvmChainId[] = [
  EvmChainIdMap.Polygon,
  EvmChainIdMap.Base,
  EvmChainIdMap.Gnosis,
];

const { Text, Title, Link } = Typography;

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

const MaintenanceAlert = ({
  agentName,
  reason,
  url,
  isPhasedOut,
}: {
  agentName: string;
  reason?: string;
  url?: string;
  isPhasedOut?: boolean;
}) => (
  <Alert
    type="warning"
    fullWidth={false}
    showIcon
    className="rounded-12"
    message={
      <Flex gap={url ? 8 : 4} vertical>
        <Text className="text-sm font-weight-500">
          {agentName} is currently unavailable
        </Text>
        <Text className="text-sm">
          New {agentName} agents cannot be created at this time
          {reason && ` ${reason}`}.
          {/* Phased-out agents no longer run, so omit the "existing agents
          continue to run" reassurance. */}
          {!isPhasedOut && ' Existing agents continue to run as usual.'}
        </Text>
        {url && (
          <Link
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-sm"
          >
            See more here
            <span className="text-xxs ml-4">
              {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </span>
          </Link>
        )}
      </Flex>
    }
  />
);

const AgentsFunXCreditDesc = () => (
  <Flex align="center" gap={4}>
    <Text>$5 for X API credits</Text>
    <Link
      href={X_DEVELOPER_CONSOLE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex align-center"
    >
      charged by X
      <span className="text-xxs ml-4">{UNICODE_SYMBOLS.EXTERNAL_LINK}</span>
    </Link>
  </Flex>
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

/**
 * Operating-chain selector for Connect (multi-chain, one instance per chain).
 * Rendered in place of the static `OperatingChain` display. Chains that already
 * have a Connect instance are disabled ("Already added").
 */
type ConnectChainSelectProps = {
  selectedChain?: EvmChainId;
  onSelectChain?: (chain: EvmChainId) => void;
};
const ConnectChainSelect = ({
  selectedChain,
  onSelectChain,
}: ConnectChainSelectProps) => {
  const { services } = useServices();
  const connectConfig = AGENT_CONFIG[AgentMap.Connect];

  const occupiedChains = useMemo(() => {
    const occupied = new Set<EvmChainId>();
    (services ?? []).forEach((service) => {
      if (matchesAgentConfig(service, connectConfig)) {
        occupied.add(asEvmChainId(service.home_chain));
      }
    });
    return occupied;
  }, [services, connectConfig]);

  return (
    <Flex vertical gap={8}>
      <Text className="text-neutral-tertiary">Operating chain</Text>
      <Select
        size="large"
        placeholder="Select a chain"
        value={selectedChain}
        onChange={(value) => onSelectChain?.(value as EvmChainId)}
        style={{ width: '100%' }}
      >
        {CONNECT_CHAIN_OPTIONS.map((chainId) => {
          const isOccupied = occupiedChains.has(chainId);
          return (
            <Select.Option
              key={chainId}
              value={chainId}
              disabled={isOccupied}
              label={EvmChainName[chainId]}
            >
              <Flex align="center" gap={8}>
                <Image
                  src={CHAIN_IMAGE_MAP[chainId]}
                  width={20}
                  height={20}
                  alt={EvmChainName[chainId]}
                />
                {EvmChainName[chainId]}
                {isOccupied && (
                  <Tag bordered={false} className="ml-auto">
                    Already added
                  </Tag>
                )}
              </Flex>
            </Select.Option>
          );
        })}
      </Select>
    </Flex>
  );
};

type MinimumFundingRequirementsProps = {
  agentType: AgentType;
  /** Override chain (Connect selects its chain in this step). */
  chainId?: EvmChainId;
};
const MinimumFundingRequirements = ({
  agentType,
  chainId,
}: MinimumFundingRequirementsProps) => {
  const { evmHomeChainId } = AGENT_CONFIG[agentType];
  const targetChain = chainId ?? evmHomeChainId;
  const tokens = useInitialFundingRequirements(agentType, chainId);

  const allTokens = Object.entries(tokens[targetChain] || {})
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
          Minimum funding requirements
        </Text>
        <Text className="text-tag">No funding required</Text>
      </Flex>
    );
  }

  return (
    <Flex vertical gap={8}>
      <Text className="text-neutral-tertiary">
        Minimum funding requirements
      </Text>
      <Flex vertical className="text-tag" gap={12}>
        {allTokens.map(({ token, amount, icon }) => (
          <Flex key={token} gap={8} align="flex-start">
            <Image src={icon} alt={`${token} token`} width={20} height={20} />
            <Text className="leading-normal">
              {amount} {token}
            </Text>
          </Flex>
        ))}
        {agentType === AgentMap.AgentsFun && <AgentsFunXCreditDesc />}
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
  /** Connect only: the operating chain chosen in this step, and its setter. */
  selectedChain?: EvmChainId;
  onSelectChain?: (chain: EvmChainId) => void;
};

export const FundingRequirementStep = ({
  agentType,
  desc,
  selectedChain,
  onSelectChain,
}: FundingRequirementStepProps) => {
  const {
    displayName: agentName,
    middlewareHomeChainId,
    category,
    isUnderConstruction,
    isAddingNewBlocked,
    isPhasedOut,
  } = AGENT_CONFIG[agentType];
  const { name, displayName } = asEvmChainDetails(middlewareHomeChainId);
  const isConnect = agentType === AgentMap.Connect;

  const blockingAlert = isUnderConstruction ? (
    <UnderConstructionAlert />
  ) : isAddingNewBlocked ? (
    <MaintenanceAlert
      agentName={agentName}
      isPhasedOut={isPhasedOut}
      reason={
        agentType === AgentMap.Polystrat
          ? 'due to recent Polymarket protocol updates'
          : undefined
      }
      url={
        agentType === AgentMap.Polystrat
          ? POLYMARKET_DEPOSIT_WALLET_MIGRATION_URL
          : undefined
      }
    />
  ) : null;

  return (
    <IntroductionAnimatedContainer>
      <Flex vertical gap={24} style={{ padding: 20, marginBottom: 12 }}>
        <Header
          agentType={agentType}
          agentName={agentName}
          category={category}
          desc={desc}
        />
        {blockingAlert ? (
          <div style={{ marginBottom: 300 }}>{blockingAlert}</div>
        ) : isConnect ? (
          <>
            <ConnectChainSelect
              selectedChain={selectedChain}
              onSelectChain={onSelectChain}
            />
            {selectedChain != null && (
              <MinimumFundingRequirements
                agentType={agentType}
                chainId={selectedChain}
              />
            )}
          </>
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
