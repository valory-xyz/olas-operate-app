import { CopyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Image, TableColumnsType, Typography } from 'antd';
import { entries } from 'lodash';
import { useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { BackButton, CardFlex, Table } from '@/components/ui';
import { TokenSymbol, TokenSymbolConfigMap } from '@/constants';
import { AvailableAsset } from '@/types/Wallet';
import { formatNumber } from '@/utils';

import { usePearlWallet } from '../../PearlWalletProvider';
import { STEPS } from '../../types';
import { YouPayContainer } from './common';

const { Title, Text, Paragraph } = Typography;

const TransferTitleAndDescription = ({ chainName }: { chainName: string }) => (
  <>
    <Title className="m-0" level={3}>
      Transfer Crypto on {chainName}
    </Title>
    <Paragraph className="m-0 text-neutral-secondary">
      Send the specified amounts from your external wallet to the Pearl Wallet
      address below. When you’re done, you can leave this screen — after the
      transfer confirms on {chainName}, your Pearl Wallet balance updates
      automatically.
    </Paragraph>
  </>
);

const ChainWarningAlert = ({ chainName }: { chainName: string }) => (
  <CustomAlert
    message={`Only send on ${chainName} Chain — funds on other networks are unrecoverable.`}
    type="warning"
    showIcon
    className="text-sm"
    style={{ padding: '10px 12px' }}
  />
);

const TransferDetails = ({ chainName }: { chainName: string }) => {
  return (
    <YouPayContainer vertical gap={24}>
      <Flex vertical gap={8}>
        <Text className="text-sm text-neutral-tertiary">On</Text>
        <Text>{chainName} Chain</Text>
      </Flex>

      <Flex vertical gap={8}>
        <Text className="text-sm text-neutral-tertiary">From</Text>
        <Text>Your external wallet</Text>
      </Flex>

      <Flex vertical gap={8}>
        <Text className="text-sm text-neutral-tertiary">To Pearl Wallet</Text>
        <Text>{chainName} Chain</Text>
        <Flex>
          <Button size="small" icon={<CopyOutlined />}>
            Copy
          </Button>
        </Flex>
      </Flex>
    </YouPayContainer>
  );
};

const DoesNotTrackIncomingTransfers = () => (
  <Flex align="start" gap={8}>
    <InfoCircleOutlined className="mt-4 text-neutral-tertiary" />
    <Paragraph className="text-sm m-0 text-neutral-tertiary">
      This screen doesn’t track incoming transfers. To verify, review the Pearl
      Wallet balance or transaction history.
    </Paragraph>
  </Flex>
);

const columns: TableColumnsType<AvailableAsset> = [
  {
    title: 'Token',
    key: 'token',
    render: (_: unknown, record: AvailableAsset) => (
      <Flex align="center" gap={8}>
        <Image
          src={TokenSymbolConfigMap[record.symbol].image}
          alt={record.symbol}
          width={20}
          className="flex"
        />
        <Text>{record.symbol}</Text>
      </Flex>
    ),
    width: '50%',
  },
  {
    title: 'Requested Deposit Amount',
    key: 'requestedDepositAmount',
    render: (_: unknown, record: AvailableAsset) => (
      <Text>{formatNumber(record.amount, 4)}</Text>
    ),
    width: '50%',
  },
] as const;

type TransferCryptoOnProps = {
  chainName: string;
  onBack: () => void;
};

export const TransferCryptoOn = ({
  chainName,
  onBack,
}: TransferCryptoOnProps) => {
  const { amountsToDeposit, updateStep } = usePearlWallet();

  const tokenAndDepositedAmounts = useMemo<AvailableAsset[]>(
    () =>
      entries(amountsToDeposit).map(([tokenSymbol, amount]) => ({
        symbol: tokenSymbol as TokenSymbol,
        amount,
      })),
    [amountsToDeposit],
  );

  return (
    <CardFlex $noBorder $padding="32px" style={{ width: 624 }}>
      <Flex vertical gap={24}>
        <Flex vertical gap={16}>
          <BackButton onPrev={onBack} />
          <TransferTitleAndDescription chainName={chainName} />
        </Flex>

        <ChainWarningAlert chainName={chainName} />
        <TransferDetails chainName={chainName} />
        <Table<AvailableAsset>
          dataSource={tokenAndDepositedAmounts}
          columns={columns}
          rowKey={(record) => record.symbol}
          pagination={false}
          rowHoverable={false}
          locale={{ emptyText: 'No tokens to deposit.' }}
        />

        <DoesNotTrackIncomingTransfers />
        <Button
          onClick={() => updateStep(STEPS.PEARL_WALLET_SCREEN)}
          size="large"
        >
          Back to Pearl Wallet
        </Button>
      </Flex>
    </CardFlex>
  );
};
