import { Button, Flex, Typography } from 'antd';
import styled from 'styled-components';

import { BackButton, CardFlex, RequiredTokenList } from '@/components/ui';
import { SETUP_SCREEN } from '@/constants';
import { useSetup } from '@/hooks';
import { useWalletContribution } from '@/hooks/useWalletContribution';

const { Text, Title } = Typography;

const Container = styled(Flex)`
  max-width: 408px;
  margin: 0 auto;
`;

export const BalanceCheck = () => {
  const { goto } = useSetup();
  const { walletContributions, isLoading } = useWalletContribution();

  return (
    <Container vertical>
      <BackButton onPrev={() => goto(SETUP_SCREEN.SelectStaking)} />
      <Title level={3} className="mt-12">
        Using Your Pearl Wallet Balance
      </Title>
      <Text className="text-neutral-secondary">
        Some of the required funds will be taken from your Pearl wallet.
        You&apos;ll need to deposit the remaining amount in the next step.
      </Text>

      <CardFlex size="default" className="mt-32">
        <RequiredTokenList
          title="From Pearl wallet"
          tokenRequirements={walletContributions}
          isLoading={isLoading}
        />

        <Button
          type="primary"
          size="large"
          onClick={() => goto(SETUP_SCREEN.FundYourAgent)}
          disabled={isLoading}
          className="mt-24"
          block
        >
          Continue
        </Button>
      </CardFlex>
    </Container>
  );
};
