import { Button, Flex, Typography } from 'antd';
import Paragraph from 'antd/es/typography/Paragraph';
import styled from 'styled-components';

import { BackButton } from '@/components/ui/BackButton';
import { EvmChainName } from '@/constants/chains';
import { COLOR } from '@/constants/colors';
import { SetupScreen } from '@/enums/SetupScreen';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';

import { useTotalFiatFromNativeToken } from '../Create/SetupOnRamp/PayingReceivingTable/useTotalFiatFromNativeToken';
import { useTotalNativeTokenRequired } from '../Create/SetupOnRamp/PayingReceivingTable/useTotalNativeTokenRequired';
import { useGetRefillRequimentsWithMonthlyGas } from './hooks/useGetRefillRequirementsWithMonthlyGas';
import { type TokenRequirement, TokenRequirements } from './TokensRequirements';

const { Title, Text } = Typography;

const FundYourAgentContainer = styled(Flex)`
  align-items: center;
  flex-direction: column;

  .back-button {
    font-size: 16px;
    color: ${COLOR.TEXT_NEUTRAL_TERTIARY} !important;
  }
`;

const FundMethodCard = styled.div`
  background-color: ${COLOR.WHITE};
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 370px;
  justify-content: space-between;
  border: 1px solid ${COLOR.WHITE};
  box-shadow:
    0 74px 21px 0 rgba(170, 193, 203, 0),
    0 47px 19px 0 rgba(170, 193, 203, 0.01),
    0 26px 16px 0 rgba(170, 193, 203, 0.05),
    0 12px 12px 0 rgba(170, 193, 203, 0.09),
    0 3px 6px 0 rgba(170, 193, 203, 0.1);
`;

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <Title
    className="text-neutral-primary"
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
    }}
  >
    {children}
  </Paragraph>
);

type FundMethodCardProps = {
  chainName: string;
  tokenRequirements: TokenRequirement[] | undefined;
  isBalancesAndFundingRequirementsLoading: boolean;
};

const OnRamp = () => {
  const { networkId: onRampChainId } = useOnRampContext();

  const {
    isLoading: isNativeTokenLoading,
    hasError: hasNativeTokenError,
    totalNativeToken,
  } = useTotalNativeTokenRequired(onRampChainId!);
  const { isLoading: isFiatLoading, data: fiatAmount } =
    useTotalFiatFromNativeToken(
      hasNativeTokenError ? undefined : totalNativeToken,
    );

  return (
    <FundMethodCard>
      <div>
        <CardTitle>Buy</CardTitle>
        <CardDescription>
          Pay in fiat by using your credit or debit card — perfect for speed and
          ease!
        </CardDescription>
        <TokenRequirements
          fiatAmount={fiatAmount ?? 0}
          isLoading={isNativeTokenLoading || isFiatLoading}
          fundType="onRamp"
        />
      </div>
      <Button type="primary" size="large">
        Buy Crypto with USD
      </Button>
    </FundMethodCard>
  );
};

const Transfer = ({
  chainName,
  tokenRequirements,
  isBalancesAndFundingRequirementsLoading,
}: FundMethodCardProps) => (
  <FundMethodCard>
    <div>
      <CardTitle>Transfer</CardTitle>
      <CardDescription>
        Send funds directly on Optimism chain with lowest fees — ideal for
        crypto-savvy users.
      </CardDescription>
      <TokenRequirements
        fundType="transfer"
        tokenRequirements={tokenRequirements}
        chainName={chainName}
        isLoading={isBalancesAndFundingRequirementsLoading}
      />
    </div>
    <Button size="large">Transfer Crypto on {chainName}</Button>
  </FundMethodCard>
);

const Bridge = ({
  chainName,
  tokenRequirements,
  isBalancesAndFundingRequirementsLoading,
}: FundMethodCardProps) => (
  <FundMethodCard>
    <div>
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
    <Button size="large">Bridge Crypto from Ethereum</Button>
  </FundMethodCard>
);

export const FundYourAgent = () => {
  const { selectedAgentConfig } = useServices();
  const { goto } = useSetup();
  const { evmHomeChainId } = selectedAgentConfig;
  const chainName = EvmChainName[evmHomeChainId];
  const { tokenRequirements, isLoading } = useGetRefillRequimentsWithMonthlyGas(
    {
      selectedAgentConfig,
      shouldCreateDummyService: true,
    },
  );
  const [isBridgeOnboardingEnabled, isOnRampEnabled] = useFeatureFlag([
    'bridge-onboarding',
    'on-ramp',
  ]);

  return (
    <FundYourAgentContainer>
      <BackButton onPrev={() => goto(SetupScreen.AgentOnboarding)} />
      <Title
        className="text-neutral-primary"
        level={4}
        style={{ fontSize: 24, fontWeight: 500, marginTop: 12 }}
      >
        Fund your {selectedAgentConfig.displayName}
      </Title>
      <Text className="text-neutral-secondary">
        Select the payment method that suits you best.
      </Text>

      <Flex gap={24} style={{ marginTop: 56 }}>
        {isOnRampEnabled && <OnRamp />}
        <Transfer
          chainName={chainName}
          tokenRequirements={tokenRequirements}
          isBalancesAndFundingRequirementsLoading={isLoading}
        />
        {isBridgeOnboardingEnabled && (
          <Bridge
            chainName={chainName}
            tokenRequirements={tokenRequirements}
            isBalancesAndFundingRequirementsLoading={isLoading}
          />
        )}
      </Flex>
    </FundYourAgentContainer>
  );
};
