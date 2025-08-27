import { Button, Flex, Skeleton, Typography } from 'antd';
import Paragraph from 'antd/es/typography/Paragraph';
import { useEffect, useMemo } from 'react';
import styled from 'styled-components';

import { AddressBalanceRecord, MasterSafeBalanceRecord } from '@/client';
import { getTokenDetails } from '@/components/Bridge/utils';
import { BackButton } from '@/components/ui/BackButton';
import {
  getNativeTokenSymbol,
  TOKEN_CONFIG,
  TokenConfig,
} from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { EvmChainName } from '@/constants/chains';
import { COLOR } from '@/constants/colors';
import { TokenSymbol, TokenSymbolConfigMap } from '@/constants/token';
import { SetupScreen } from '@/enums/SetupScreen';
import { MasterEoa } from '@/enums/Wallet';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { AgentConfig } from '@/types/Agent';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { useBeforeBridgeFunds } from '../Create/SetupEoaFunding/useBeforeBridgeFunds';

const { Title, Text } = Typography;

const FundYourAgentContainer = styled(Flex)`
  align-items: center;
  flex-direction: column;

  .back-button {
    font-size: 16px;
    color: ${COLOR.TEXT_NEUTRAL_TERTIARY} !important;
  }
`;

const PaymentMethodCard = styled.div`
  background-color: ${COLOR.WHITE};
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  width: 370px;
  justify-content: space-between;
  border: 1px solid ${COLOR.WHITE};
`;

const RequirementsContainer = styled(Flex)`
  flex-direction: column;
  gap: 12px;
  background-color: ${COLOR.BACKGROUND};
  padding: 12px 16px;
  border-radius: 12px;
  margin: 12px 0 32px;
`;

const RequirementsSkeleton = () => (
  <div style={{ marginTop: 16 }}>
    <Text className="text-neutral-tertiary">Requirements</Text>
    <RequirementsContainer>
      {[1, 2, 3].map((index) => (
        <Flex key={index} align="center" gap={8} style={{ width: '100%' }}>
          <Skeleton.Avatar
            size={20}
            shape="circle"
            active
            style={{ backgroundColor: '#e0e0e0' }}
          />
          <Skeleton.Input
            size="small"
            style={{ width: 120, height: 16, backgroundColor: '#e0e0e0' }}
            active
          />
        </Flex>
      ))}
      <Skeleton.Input
        size="small"
        style={{ width: 200, height: 14, backgroundColor: '#e0e0e0' }}
        active
      />
    </RequirementsContainer>
  </div>
);

const TokenRequirements = ({
  tokenRequirements,
  chainName,
  isLoading,
}: {
  tokenRequirements: TokenRequirement[];
  chainName: string;
  isLoading: boolean;
}) => {
  if (isLoading) return <RequirementsSkeleton />;

  return (
    <>
      {tokenRequirements.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text className="text-neutral-tertiary">Requirements</Text>
          <RequirementsContainer>
            {tokenRequirements.map(({ amount, symbol, iconSrc }) => (
              <Flex
                key={symbol}
                align="center"
                gap={8}
                style={{ width: '100%' }}
              >
                <img
                  src={iconSrc}
                  alt={symbol}
                  style={{
                    height: 20,
                  }}
                />
                <Text>
                  {amount.toFixed(4)} {symbol}
                </Text>
              </Flex>
            ))}
            <Text className="text-neutral-tertiary" style={{ fontSize: 14 }}>
              + transaction fees on {chainName}.
            </Text>
          </RequirementsContainer>
        </div>
      )}
    </>
  );
};

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <Title
    level={4}
    style={{
      fontSize: 20,
      fontWeight: 500,
      textAlign: 'center',
      marginTop: 20,
      marginBottom: 24,
    }}
  >
    {children}
  </Title>
);

const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <Paragraph
    className="text-neutral-secondary"
    style={{
      minHeight: '4.5rem',
      textAlign: 'justify',
    }}
  >
    {children}
  </Paragraph>
);

type PaymentMethodProps = {
  selectedAgentConfig: AgentConfig;
  tokenRequirements: TokenRequirement[];
  isBalancesAndFundingRequirementsLoading: boolean;
};

const OnRamp = () => {
  return (
    <PaymentMethodCard>
      <div>
        <CardTitle>Buy</CardTitle>
        <CardDescription>
          Pay in fiat by using your credit or debit card — perfect for speed and
          ease!
        </CardDescription>
      </div>
      <Button type="primary" size="large">
        Buy Crypto with USD
      </Button>
    </PaymentMethodCard>
  );
};

const Transfer = ({
  selectedAgentConfig,
  tokenRequirements,
  isBalancesAndFundingRequirementsLoading,
}: PaymentMethodProps) => {
  const { evmHomeChainId } = selectedAgentConfig;
  const chainName = EvmChainName[evmHomeChainId];

  return (
    <PaymentMethodCard>
      <div>
        <CardTitle>Transfer</CardTitle>
        <CardDescription>
          Send funds directly on Optimism chain with lowest fees — ideal for
          crypto-savvy users.
        </CardDescription>
        <TokenRequirements
          tokenRequirements={tokenRequirements}
          chainName={chainName}
          isLoading={isBalancesAndFundingRequirementsLoading}
        />
      </div>
      <Button size="large">Transfer Crypto on {chainName}</Button>
    </PaymentMethodCard>
  );
};

const Bridge = ({
  selectedAgentConfig,
  tokenRequirements,
  isBalancesAndFundingRequirementsLoading,
}: PaymentMethodProps) => {
  const { evmHomeChainId } = selectedAgentConfig;
  const chainName = EvmChainName[evmHomeChainId];

  return (
    <PaymentMethodCard>
      <div>
        <CardTitle>Bridge</CardTitle>
        <CardDescription>
          Send funds directly on {chainName} chain with lowest fees — ideal for
          crypto-savvy users.
        </CardDescription>
        <TokenRequirements
          tokenRequirements={tokenRequirements}
          chainName={chainName}
          isLoading={isBalancesAndFundingRequirementsLoading}
        />
      </div>
      <Button size="large">Transfer Crypto on {chainName}</Button>
    </PaymentMethodCard>
  );
};

/**
 * Utility function to extract total funds required per token from refillRequirements
 */
type TokenRequirement = {
  amount: number;
  symbol: string;
  iconSrc: string;
};

const getTokenRequirementsWithDetails = (
  refillRequirements:
    | AddressBalanceRecord
    | MasterSafeBalanceRecord
    | undefined,
  masterEoa: MasterEoa | undefined,
  selectedAgentConfig: AgentConfig,
): TokenRequirement[] => {
  if (!refillRequirements || !masterEoa) return [];

  const { evmHomeChainId } = selectedAgentConfig;
  const chainConfig = TOKEN_CONFIG[evmHomeChainId];

  // refill_requirements_masterEOA
  const masterEoaRequirementAmount = (
    refillRequirements as AddressBalanceRecord
  )[masterEoa.address]?.[AddressZero];

  const requirementsPerToken = {} as { [tokenAddress: Address]: string };

  // refill_requirements_masterSafe
  Object.entries(
    (refillRequirements as MasterSafeBalanceRecord)['master_safe'],
  )?.forEach(([tokenAddress, amount]) => {
    if (tokenAddress === AddressZero) {
      // Native token - combine master safe and master EOA requirements
      const totalAmount =
        BigInt(amount) + BigInt(masterEoaRequirementAmount || 0);
      requirementsPerToken[tokenAddress as Address] = totalAmount.toString();
    } else {
      requirementsPerToken[tokenAddress as Address] = amount.toString();
    }
  });

  // Parse amounts and get token details
  const tokenRequirements: TokenRequirement[] = [];

  Object.entries(requirementsPerToken).forEach(([tokenAddress, amount]) => {
    let symbol: string;
    let iconSrc: string;
    let decimals: number;

    if (tokenAddress === AddressZero) {
      const nativeTokenSymbol = getNativeTokenSymbol(evmHomeChainId);
      const nativeTokenConfig = chainConfig[nativeTokenSymbol];
      symbol = nativeTokenSymbol;
      iconSrc = TokenSymbolConfigMap[nativeTokenSymbol].image;
      decimals = nativeTokenConfig.decimals;
    } else {
      const tokenDetails = getTokenDetails(
        tokenAddress,
        chainConfig,
      ) as TokenConfig;
      symbol = tokenDetails.symbol;
      iconSrc = TokenSymbolConfigMap[tokenDetails.symbol as TokenSymbol]?.image;
      decimals = tokenDetails.decimals;
    }

    const parsedAmount = formatUnitsToNumber(amount, decimals);

    if (parsedAmount > 0) {
      tokenRequirements.push({
        amount: parsedAmount,
        symbol,
        iconSrc,
      });
    }
  });

  return tokenRequirements.sort((a, b) => b.amount - a.amount);
};

export const FundYourAgent = () => {
  const { selectedAgentConfig } = useServices();
  const { goto } = useSetup();
  const updateBeforeBridgingFunds = useBeforeBridgeFunds();
  const {
    refillRequirements,
    refetch,
    isBalancesAndFundingRequirementsLoading,
  } = useBalanceAndRefillRequirementsContext();
  const { masterEoa } = useMasterWalletContext();

  const tokenRequirements = useMemo(
    () =>
      getTokenRequirementsWithDetails(
        refillRequirements,
        masterEoa,
        selectedAgentConfig,
      ),
    [refillRequirements, masterEoa, selectedAgentConfig],
  );

  useEffect(() => {
    const createDummyService = async () => {
      await updateBeforeBridgingFunds();
      await refetch?.();
    };
    createDummyService();
  }, [updateBeforeBridgingFunds, refetch]);

  return (
    <FundYourAgentContainer>
      <BackButton onPrev={() => goto(SetupScreen.AgentOnboarding)} />
      <Title level={4} style={{ fontWeight: 500, marginTop: 12 }}>
        Fund your {selectedAgentConfig.displayName}
      </Title>
      <Text style={{ color: COLOR.TEXT_NEUTRAL_SECONDARY }}>
        Select the payment method that suits you best.
      </Text>

      <Flex gap={24} align="stretch" style={{ marginTop: 56 }}>
        <OnRamp
        //   selectedAgentConfig={selectedAgentConfig}
        //   tokenRequirements={tokenRequirements}
        //   isBalancesAndFundingRequirementsLoading={
        //     isBalancesAndFundingRequirementsLoading
        //   }
        />
        <Transfer
          selectedAgentConfig={selectedAgentConfig}
          tokenRequirements={tokenRequirements}
          isBalancesAndFundingRequirementsLoading={
            isBalancesAndFundingRequirementsLoading
          }
        />
        <Bridge
          selectedAgentConfig={selectedAgentConfig}
          tokenRequirements={tokenRequirements}
          isBalancesAndFundingRequirementsLoading={
            isBalancesAndFundingRequirementsLoading
          }
        />
      </Flex>
    </FundYourAgentContainer>
  );
};
