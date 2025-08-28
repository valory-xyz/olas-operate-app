import { Flex, Typography } from 'antd';
import Image from 'next/image';
import styled from 'styled-components';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { BackButton } from '@/components/ui/BackButton';
import { ChainImageMap, EvmChainName } from '@/constants/chains';
import { COLOR } from '@/constants/colors';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';

const { Title, Text } = Typography;

const TransferDetailsContains = styled.div`
  background-color: ${COLOR.BACKGROUND};
  padding: 16px;
`;

export const TransferFunds = () => {
  const { goto } = usePageState();
  const { selectedAgentConfig } = useServices();
  const { evmHomeChainId } = selectedAgentConfig;
  const chainName = EvmChainName[evmHomeChainId];
  const chainImage = ChainImageMap[evmHomeChainId];

  return (
    <Flex justify="center" style={{ marginTop: 40 }}>
      <CardFlex $noBorder style={{ width: 624, padding: 8 }}>
        <BackButton onPrev={() => goto(Pages.Main)} />
        <Title
          className="text-neutral-primary"
          level={4}
          style={{ fontWeight: 500, margin: '12px 0' }}
        >
          Transfer Crypto on {chainName}
        </Title>
        <Text className="text-neutral-secondary">
          Send the specified amounts from your external wallet to the Pearl
          Wallet address below. Pearl will automatically detect your transfer.
        </Text>

        <CustomAlert
          showIcon
          type="warning"
          className="mt-24 mb-12"
          message={`Only send on ${chainName} Chain — funds on other networks are unrecoverable.`}
        />

        <TransferDetailsContains>
          <Text className="text-neutral-tertiary">On</Text>
          <Flex align="center" gap={8} style={{ marginTop: 8 }}>
            <Image width={20} height={20} src={chainImage} alt={chainName} />
            <Text className="text-neutral-primary" style={{ fontSize: 16 }}>
              {chainName} Chain
            </Text>
          </Flex>

          <Flex style={{ marginTop: 24 }}>
            <Text className="text-neutral-tertiary">From</Text>
          </Flex>
        </TransferDetailsContains>
      </CardFlex>
    </Flex>
  );
};
