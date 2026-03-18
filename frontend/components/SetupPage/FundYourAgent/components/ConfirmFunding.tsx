import { Button, Flex, Typography } from 'antd';
import { useCallback } from 'react';
import styled from 'styled-components';

import { BackButton, CardFlex, RequiredTokenList } from '@/components/ui';
import { EvmChainName, PAGES, SETUP_SCREEN } from '@/constants';
import {
  useGetRefillRequirements,
  useIsInitiallyFunded,
  usePageState,
  useServices,
  useSetup,
} from '@/hooks';

const { Text, Title } = Typography;

const Container = styled(Flex)`
  max-width: 408px;
  margin: 0 auto;
`;

export const ConfirmFunding = () => {
  const { goto: gotoSetup } = useSetup();
  const { goto: gotoPage } = usePageState();
  const { selectedAgentConfig } = useServices();
  const { setIsInitiallyFunded } = useIsInitiallyFunded();
  const { totalTokenRequirements: tokenRequirements, isLoading } =
    useGetRefillRequirements();
  const chainName = EvmChainName[selectedAgentConfig.evmHomeChainId];

  const handleConfirm = useCallback(() => {
    setIsInitiallyFunded();
    gotoPage(PAGES.Main);
  }, [setIsInitiallyFunded, gotoPage]);

  return (
    <Container vertical>
      <BackButton onPrev={() => gotoSetup(SETUP_SCREEN.SelectStaking)} />
      <Title level={3} className="mt-12">
        Confirm Agent Funding
      </Title>
      <Text className="text-neutral-secondary">
        Funds will be transferred from your Pearl wallet when the agent starts
        for the first time.
      </Text>

      <CardFlex className="mt-32">
        <RequiredTokenList
          title="From Pearl wallet"
          tokenRequirements={tokenRequirements}
          isLoading={isLoading}
          requirementsDisclaimer={`+ transaction fees on ${chainName}`}
        />

        <Button
          type="primary"
          size="large"
          className="mt-24"
          onClick={handleConfirm}
          disabled={isLoading}
          block
        >
          Confirm
        </Button>
      </CardFlex>
    </Container>
  );
};
