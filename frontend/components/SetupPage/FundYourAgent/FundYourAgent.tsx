import { Button, Flex, Typography } from 'antd';
import { ReactNode } from 'react';
import styled from 'styled-components';

import { BackButton, CardFlex, CardTitle } from '@/components/ui';
import { COLOR, EvmChainId, EvmChainName } from '@/constants';
import { SetupScreen } from '@/enums/SetupScreen';
import {
  useFeatureFlag,
  useOnRampContext,
  useServices,
  useSetup,
  useTotalFiatFromNativeToken,
  useTotalNativeTokenRequired,
} from '@/hooks';

import {
  type TokenRequirement,
  TokenRequirements,
} from './components/TokensRequirements';
import { useGetRefillRequirementsWithMonthlyGas } from './hooks/useGetRefillRequirementsWithMonthlyGas';

const { Text, Title, Paragraph } = Typography;

const FundMethodCard = styled(CardFlex)`
  width: 370px;
  border-color: ${COLOR.WHITE};

  .ant-card-body {
    height: 100%;
  }

  .fund-method-card-body {
    flex: 1;
  }
`;

const CardDescription = ({ children }: { children: ReactNode }) => (
  <Paragraph type="secondary" style={{ minHeight: '4.5rem' }}>
    {children}
  </Paragraph>
);

type FundMethodCardProps = {
  chainName: string;
  tokenRequirements: TokenRequirement[] | undefined;
  isBalancesAndFundingRequirementsLoading: boolean;
};

const OnRamp = ({ onRampChainId }: { onRampChainId: EvmChainId }) => {
  const { goto } = useSetup();

  const {
    isLoading: isNativeTokenLoading,
    hasError: hasNativeTokenError,
    totalNativeToken,
  } = useTotalNativeTokenRequired(onRampChainId, 'onboarding');
  const { isLoading: isFiatLoading, data: fiatAmount } =
    useTotalFiatFromNativeToken(
      hasNativeTokenError ? undefined : totalNativeToken,
    );
  const isLoading = isNativeTokenLoading || isFiatLoading;

  return (
    <FundMethodCard>
      <div className="fund-method-card-body">
        <CardTitle>Buy</CardTitle>
        <CardDescription>
          Pay in fiat by using your credit or debit card — perfect for speed and
          ease!
        </CardDescription>
        <TokenRequirements
          fiatAmount={fiatAmount ?? 0}
          isLoading={isLoading}
          hasError={hasNativeTokenError}
          fundType="onRamp"
        />
      </div>
      <Button
        type="primary"
        size="large"
        onClick={() => goto(SetupScreen.SetupOnRamp)}
        disabled={isLoading || hasNativeTokenError}
      >
        Buy Crypto with USD
      </Button>
    </FundMethodCard>
  );
};

const TransferTokens = ({
  chainName,
  tokenRequirements,
  isBalancesAndFundingRequirementsLoading,
}: FundMethodCardProps) => {
  const { goto } = useSetup();

  return (
    <FundMethodCard>
      <div className="fund-method-card-body">
        <CardTitle>Transfer</CardTitle>
        <CardDescription>
          Send funds directly on {chainName} with lowest fees — ideal for
          crypto-savvy users.
        </CardDescription>
        <TokenRequirements
          fundType="transfer"
          tokenRequirements={tokenRequirements}
          chainName={chainName}
          isLoading={isBalancesAndFundingRequirementsLoading}
        />
      </div>
      <Button
        size="large"
        onClick={() => goto(SetupScreen.TransferFunds)}
        disabled={isBalancesAndFundingRequirementsLoading}
      >
        Transfer Crypto on {chainName}
      </Button>
    </FundMethodCard>
  );
};

const BridgeTokens = ({
  chainName,
  tokenRequirements,
  isBalancesAndFundingRequirementsLoading,
}: FundMethodCardProps) => {
  const { goto } = useSetup();

  return (
    <FundMethodCard>
      <div className="fund-method-card-body">
        <CardTitle>Bridge</CardTitle>
        <CardDescription>
          Bridge from Ethereum Mainnet directly to your agent. Slightly more
          expensive.
        </CardDescription>
        <TokenRequirements
          tokenRequirements={tokenRequirements}
          chainName={chainName}
          isLoading={isBalancesAndFundingRequirementsLoading}
          fundType="bridge"
        />
      </div>
      <Button
        size="large"
        onClick={() => goto(SetupScreen.SetupBridgeOnboardingScreen)}
        disabled={isBalancesAndFundingRequirementsLoading}
      >
        Bridge Crypto from Ethereum
      </Button>
    </FundMethodCard>
  );
};

/**
 * Fund your agent by buying crypto via on-ramp or transferring/bridging tokens.
 */
export const FundYourAgent = () => {
  const [isBridgeOnboardingEnabled, isOnRampEnabled] = useFeatureFlag([
    'bridge-onboarding',
    'on-ramp',
  ]);
  const { goto } = useSetup();
  const { selectedAgentConfig } = useServices();
  const { evmHomeChainId, requiresSetup, isX402Enabled } = selectedAgentConfig;
  const chainName = EvmChainName[evmHomeChainId];
  const {
    totalTokenRequirements: tokenRequirements,
    isLoading,
    resetTokenRequirements,
  } = useGetRefillRequirementsWithMonthlyGas({
    // In case x402 feature is turned off, service creation for agents
    // requiring setup is already handled at the time of agentForm
    shouldCreateDummyService: requiresSetup && !isX402Enabled ? false : true,
  });

  const { networkId: onRampChainId } = useOnRampContext();
  const areTokenRequirementsLoading =
    isLoading || tokenRequirements.length === 0;

  return (
    <Flex align="center" vertical>
      <BackButton
        onPrev={() => {
          resetTokenRequirements();
          goto(SetupScreen.SelectStaking);
        }}
      />
      <Title level={3} className="mt-12">
        Fund your {selectedAgentConfig.displayName}
      </Title>
      <Text type="secondary">
        Select the payment method that suits you best.
      </Text>

      <Flex gap={24} style={{ marginTop: 56 }}>
        {isOnRampEnabled && onRampChainId && (
          <OnRamp onRampChainId={onRampChainId} />
        )}
        <TransferTokens
          chainName={chainName}
          tokenRequirements={tokenRequirements}
          isBalancesAndFundingRequirementsLoading={areTokenRequirementsLoading}
        />
        {isBridgeOnboardingEnabled && (
          <BridgeTokens
            chainName={chainName}
            tokenRequirements={tokenRequirements}
            isBalancesAndFundingRequirementsLoading={
              areTokenRequirementsLoading
            }
          />
        )}
      </Flex>
    </Flex>
  );
};
