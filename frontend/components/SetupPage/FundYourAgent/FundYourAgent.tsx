import { Button, Flex, Typography } from 'antd';
import Paragraph from 'antd/es/typography/Paragraph';
import styled from 'styled-components';

import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';
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
  width: 370px;
  border-color: ${COLOR.WHITE};

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
  const isLoading = isNativeTokenLoading || isFiatLoading || !fiatAmount;

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
          fundType="onRamp"
        />
      </div>
      <Button
        type="primary"
        size="large"
        onClick={() => goto(SetupScreen.SetupOnRamp)}
        disabled={isLoading}
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
  const { evmHomeChainId, requiresSetup } = selectedAgentConfig;
  const chainName = EvmChainName[evmHomeChainId];
  const { originalTokenRequirements: tokenRequirements, isLoading } =
    useGetRefillRequirementsWithMonthlyGas({
      selectedAgentConfig,
      /**
       * service creation for agents requiring setup is already handled
       * at the time of agent form
       */
      shouldCreateDummyService: !requiresSetup,
    });
  const [isBridgeOnboardingEnabled, isOnRampEnabled] = useFeatureFlag([
    'bridge-onboarding',
    'on-ramp',
  ]);
  const areTokenRequirementsLoading =
    isLoading || tokenRequirements.length === 0;

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
          isBalancesAndFundingRequirementsLoading={areTokenRequirementsLoading}
        />
        {isBridgeOnboardingEnabled && (
          <Bridge
            chainName={chainName}
            tokenRequirements={tokenRequirements}
            isBalancesAndFundingRequirementsLoading={
              areTokenRequirementsLoading
            }
          />
        )}
      </Flex>
    </FundYourAgentContainer>
  );
};
