import { Button, Flex, Typography } from 'antd';
import { ReactNode } from 'react';
import styled from 'styled-components';

import {
  BackButton,
  CardFlex,
  CardTitle,
  TokenRequirements,
} from '@/components/ui';
import { COLOR, EvmChainName, SETUP_SCREEN } from '@/constants';
import {
  useFeatureFlag,
  useGetRefillRequirements,
  useServices,
  useSetup,
} from '@/hooks';
import { TokenRequirement } from '@/types';

import { OnRampMethodCard } from './components/OnRampMethodCard';

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
        className="mt-auto"
        onClick={() => goto(SETUP_SCREEN.TransferFunds)}
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
          fundType="bridge"
          tokenRequirements={tokenRequirements}
          chainName={chainName}
          isLoading={isBalancesAndFundingRequirementsLoading}
          title="Estimated to pay"
        />
      </div>
      <Button
        size="large"
        onClick={() => goto(SETUP_SCREEN.SetupBridgeOnboardingScreen)}
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
  const { evmHomeChainId } = selectedAgentConfig;
  const chainName = EvmChainName[evmHomeChainId];
  const {
    totalTokenRequirements: tokenRequirements,
    isLoading,
    resetTokenRequirements,
  } = useGetRefillRequirements();

  const areTokenRequirementsLoading =
    isLoading || tokenRequirements.length === 0;

  return (
    <Flex vertical style={{ padding: '0 80px' }}>
      <Flex vertical>
        <BackButton
          onPrev={() => {
            resetTokenRequirements();
            goto(SETUP_SCREEN.SelectStaking);
          }}
        />
        <Title level={3} className="mt-12">
          Fund your {selectedAgentConfig.displayName}
        </Title>
        <Text className="text-neutral-secondary">
          Select the payment method that suits you best.
        </Text>
      </Flex>

      <Flex gap={24} style={{ marginTop: 32 }}>
        {isOnRampEnabled && <OnRampMethodCard />}
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
