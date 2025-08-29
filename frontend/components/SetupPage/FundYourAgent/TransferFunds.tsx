import { ClockCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Image, message, Table, Tag, Typography } from 'antd';
import { useCallback } from 'react';
import styled from 'styled-components';

import { CustomAlert } from '@/components/Alert';
import { CopySvg } from '@/components/custom-icons/Copy';
import { WalletSvg } from '@/components/custom-icons/Wallet';
import { InfoTooltip } from '@/components/InfoTooltip';
import { CardFlex } from '@/components/styled/CardFlex';
import { BackButton } from '@/components/ui/BackButton';
import { ChainImageMap, EvmChainName } from '@/constants/chains';
import { COLOR } from '@/constants/colors';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { copyToClipboard } from '@/utils/copyToClipboard';

import { useGetRefillRequimentsWithMonthlyGas } from './hooks/useGetRefillRequirementsWithMonthlyGas';

const { Title, Text } = Typography;

const TransferDetailsContainer = styled(Flex)`
  background-color: ${COLOR.BACKGROUND};
  padding: 16px;
  border-radius: 10px;
  margin-top: 32px;
`;

const CustomTable = styled(Table)`
  margin-top: 32px;
  background-color: ${COLOR.BACKGROUND};

  .ant-table-thead {
    border-radius: 8px;

    .ant-table-cell {
      padding: 10px 16px;
      border-bottom: none;
      font-weight: 400;
      font-size: 14px;
      color: ${COLOR.TEXT_NEUTRAL_TERTIARY};
    }
  }

  .ant-table-tbody {
    .ant-table-cell {
      padding: 14px 16px;
      border-color: ${COLOR.GRAY_4};
    }
  }
`;

const TOOLTIP_STYLE = {
  width: 'max-content',
  borderRadius: 10,
  padding: '8px 12px',
};

const ExternalWalletTooltip = () => (
  <InfoTooltip
    placement="top"
    overlayInnerStyle={TOOLTIP_STYLE}
    iconStyles={{ color: COLOR.TEXT_NEUTRAL_PRIMARY }}
  >
    <Text className="text-sm">This is the wallet you use outside Pearl</Text>
  </InfoTooltip>
);

const TransferDetailsSection = ({
  chainName,
  chainImage,
}: {
  chainName: string;
  chainImage: string;
}) => {
  const { masterEoa } = useMasterWalletContext();
  const address = masterEoa?.address;

  const handleCopyAddress = useCallback(() => {
    if (address)
      copyToClipboard(address).then(() => message.success('Address copied!'));
  }, [address]);

  return (
    <TransferDetailsContainer vertical gap={24}>
      <Flex vertical gap={8}>
        <Text className="text-neutral-tertiary">On</Text>
        <Flex align="center" gap={8}>
          <Image width={20} height={20} src={chainImage} alt={chainName} />
          <Text className="text-neutral-primary" style={{ fontSize: 16 }}>
            {chainName} Chain
          </Text>
        </Flex>
      </Flex>

      <Flex vertical gap={8}>
        <Text className="text-neutral-tertiary">From</Text>
        <Flex align="center" gap={8}>
          <WalletSvg />
          <Text>Your external wallet</Text>
          <ExternalWalletTooltip />
        </Flex>
      </Flex>

      <Flex vertical gap={8}>
        <Text className="text-neutral-tertiary">To Pearl Wallet</Text>
        <Flex align="center" gap={8}>
          <WalletSvg />
          <Text>{address}</Text>
        </Flex>
      </Flex>

      <Flex style={{ marginTop: -8 }}>
        <Button
          size="small"
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={handleCopyAddress}
        >
          <CopySvg /> Copy
        </Button>
      </Flex>
    </TransferDetailsContainer>
  );
};

const TokenRequirementsTable = () => {
  const { selectedAgentConfig } = useServices();
  const { tokenRequirements, isLoading } = useGetRefillRequimentsWithMonthlyGas(
    // TODO: remove the dummy service prop when integrated properly.
    { selectedAgentConfig, shouldCreateDummyService: true },
  );

  const data = (tokenRequirements ?? []).map((token) => ({
    ...token,
    status: 'Waiting',
  }));

  const columns = [
    {
      title: 'Token',
      render: (_: unknown, record: (typeof data)[number]) => (
        <Flex align="center" gap={8}>
          <Image width={20} src={record.iconSrc} alt={record.symbol} />
          <Text>{record.symbol}</Text>
        </Flex>
      ),
    },
    {
      title: 'Amount',
      render: (_: unknown, record: (typeof data)[number]) => (
        <Text>{record.amount}</Text>
      ),
    },
    {
      title: 'Status',
      render: () => <Tag icon={<ClockCircleOutlined />}>Waiting</Tag>,
    },
  ];

  return (
    <CustomTable
      dataSource={data}
      columns={columns}
      loading={isLoading}
      pagination={false}
    />
  );
};

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
          className="mt-24"
          message={`Only send on ${chainName} Chain — funds on other networks are unrecoverable.`}
        />

        <TransferDetailsSection chainName={chainName} chainImage={chainImage} />

        <TokenRequirementsTable />
      </CardFlex>
    </Flex>
  );
};
