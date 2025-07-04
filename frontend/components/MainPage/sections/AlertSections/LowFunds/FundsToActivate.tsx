import { Flex, Typography } from 'antd';
import Link from 'next/link';
import { useMemo } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import { getNativeTokenSymbol } from '@/config/tokens';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SWAP_URL_BY_EVM_CHAIN } from '@/constants/urls';
import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { useNeedsFunds } from '@/hooks/useNeedsFunds';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { InlineBanner } from './InlineBanner';
import { useLowFundsDetails } from './useLowFunds';

const { Text } = Typography;

type FundsToActivateProps = {
  stakingFundsRequired: boolean;
  nativeFundsRequired: boolean;
  additionalFundsRequired?: boolean;
};

const FUNDS_REQUIRED_FOR_BY_AGENT_TYPE: { [key in AgentType]: string } = {
  [AgentType.PredictTrader]: 'for trading',
  [AgentType.AgentsFun]: 'for agent operations',
  [AgentType.Modius]: 'for investment',
  [AgentType.Optimus]: 'for investment',
  [AgentType.AgentsFunCelo]: 'for agent operations',
} as const;

export const FundsToActivate = ({
  stakingFundsRequired = true,
  nativeFundsRequired = true,
  additionalFundsRequired = true,
}: FundsToActivateProps) => {
  const { selectedStakingProgramId } = useStakingProgram();

  const { serviceFundRequirements } = useNeedsFunds(selectedStakingProgramId);

  const { selectedAgentConfig, selectedAgentType } = useServices();
  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const nativeTokenSymbol = getNativeTokenSymbol(homeChainId);
  const { chainName, masterSafeAddress } = useLowFundsDetails();

  // Calculate the required OLAS
  const olasRequired = useMemo(() => {
    if (!serviceFundRequirements[homeChainId]) return;

    const olas = serviceFundRequirements[homeChainId][TokenSymbol.OLAS];
    return `${UNICODE_SYMBOLS.OLAS}${olas} OLAS `;
  }, [homeChainId, serviceFundRequirements]);

  // Calculate the required native token (Eg. ETH)
  const nativeTokenRequired = useMemo(() => {
    if (!serviceFundRequirements[homeChainId]) return;

    const native = serviceFundRequirements[homeChainId][nativeTokenSymbol];
    return `${native} ${nativeTokenSymbol}`;
  }, [homeChainId, serviceFundRequirements, nativeTokenSymbol]);

  // Calculate additional tokens requirements (Eg. USDC)
  const additionalTokensRequired = useMemo(() => {
    if (!serviceFundRequirements[homeChainId]) return [];

    const additionalTokens = Object.keys(
      serviceFundRequirements[homeChainId],
    ).filter(
      (token) => token !== TokenSymbol.OLAS && token !== nativeTokenSymbol,
    );

    if (additionalTokens.length === 0) return [];

    return additionalTokens.map((tokenSymbol) => {
      const token = serviceFundRequirements[homeChainId]?.[tokenSymbol];
      return `${token} ${tokenSymbol}`;
    });
  }, [homeChainId, serviceFundRequirements, nativeTokenSymbol]);

  const getOlasText = useMemo(() => {
    const chainName = CHAIN_CONFIG[homeChainId].name;
    if (
      homeChainId === EvmChainId.Mode ||
      homeChainId === EvmChainId.Optimism
    ) {
      return `Get OLAS + USDC on ${chainName}`;
    }
    return `Get OLAS on ${chainName}`;
  }, [homeChainId]);

  return (
    <>
      <Text>
        To activate your agent, add these amounts on {chainName} chain to your
        safe:
      </Text>

      <Flex gap={0} vertical>
        {stakingFundsRequired && (
          <div>
            {UNICODE_SYMBOLS.BULLET} <Text strong>{olasRequired}</Text> - for
            staking.
          </div>
        )}

        {nativeFundsRequired && (
          <div>
            {UNICODE_SYMBOLS.BULLET} <Text strong>{nativeTokenRequired}</Text> -
            {` ${FUNDS_REQUIRED_FOR_BY_AGENT_TYPE[selectedAgentType]}.`}
          </div>
        )}

        {additionalFundsRequired &&
          additionalTokensRequired.map((additionalToken) => (
            <div key={additionalToken}>
              {UNICODE_SYMBOLS.BULLET} <Text strong>{additionalToken}</Text> -
              {` ${FUNDS_REQUIRED_FOR_BY_AGENT_TYPE[selectedAgentType]}.`}
            </div>
          ))}
      </Flex>

      {masterSafeAddress && (
        <InlineBanner
          text="Your safe address"
          address={masterSafeAddress}
          extra={
            <Link target="_blank" href={SWAP_URL_BY_EVM_CHAIN[homeChainId]}>
              {getOlasText} {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </Link>
          }
        />
      )}
    </>
  );
};
