import { Button, Flex, Typography } from 'antd';
import Paragraph from 'antd/es/typography/Paragraph';
import styled from 'styled-components';

import { CardFlex } from '@/components/styled/CardFlex';
import { BackButton } from '@/components/ui/BackButton';
import { CardTitle } from '@/components/ui/Typography';
import { EvmChainName } from '@/constants/chains';
import { COLOR } from '@/constants/colors';
import { SetupScreen } from '@/enums/SetupScreen';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { useTotalFiatFromNativeToken } from '@/hooks/useTotalFiatFromNativeToken';
import { useTotalNativeTokenRequired } from '@/hooks/useTotalNativeTokenRequired';

import {
  type TokenRequirement,
  TokenRequirements,
} from './components/TokensRequirements';
import { useGetRefillRequirementsWithMonthlyGas } from './hooks/useGetRefillRequirementsWithMonthlyGas';

const { Text, Title } = Typography;

const FundYourAgentContainer = styled(Flex)`
  align-items: center;
  flex-direction: column;
`;

const FundMethodCard = styled(CardFlex)`
  border-radius: 16px;
  width: 370px;
  border-color: ${COLOR.WHITE};
  box-shadow:
    0 74px 21px 0 rgba(170, 193, 203, 0),
    0 47px 19px 0 rgba(170, 193, 203, 0.01),
    0 26px 16px 0 rgba(170, 193, 203, 0.05),
    0 12px 12px 0 rgba(170, 193, 203, 0.09),
    0 3px 6px 0 rgba(170, 193, 203, 0.1);

  .ant-card-body {
    height: 100%;
  }

  .fund-method-card-body {
    flex: 1;
  }
`;

const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <Paragraph
    type="secondary"
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
  const { goto } = useSetup();

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
      <div className="fund-method-card-body">
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
      <Button
        type="primary"
        size="large"
        onClick={() => goto(SetupScreen.SetupOnRamp)}
        disabled={isNativeTokenLoading || isFiatLoading}
      >
        Buy Crypto with USD
      </Button>
    </FundMethodCard>
  );
};

const Transfer = ({
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

const Bridge = ({
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

export const FundYourAgent = () => {
  const { selectedAgentConfig } = useServices();
  const { goto } = useSetup();
  const { evmHomeChainId } = selectedAgentConfig;
  const chainName = EvmChainName[evmHomeChainId];
  const { tokenRequirements, isLoading } =
    useGetRefillRequirementsWithMonthlyGas({
      selectedAgentConfig,
      shouldCreateDummyService: true,
    });
  const [isBridgeOnboardingEnabled, isOnRampEnabled] = useFeatureFlag([
    'bridge-onboarding',
    'on-ramp',
  ]);

  return (
    <FundYourAgentContainer>
      <BackButton onPrev={() => goto(SetupScreen.AgentOnboarding)} />
      <Title level={3} className="mt-12">
        Fund your {selectedAgentConfig.displayName}
      </Title>
      <Text type="secondary">
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
