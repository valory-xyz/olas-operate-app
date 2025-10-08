import { CopyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Image, TableColumnsType, Typography } from 'antd';
import { entries, kebabCase } from 'lodash';
import { useCallback, useMemo } from 'react';
import { styled } from 'styled-components';

import { CustomAlert } from '@/components/Alert';
import { WalletOutlined } from '@/components/custom-icons';
import { BackButton, CardFlex, Table } from '@/components/ui';
import { COLOR, TokenSymbol, TokenSymbolConfigMap } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import { useMasterWalletContext } from '@/hooks';
import { Address } from '@/types/Address';
import { AvailableAsset } from '@/types/Wallet';
import { copyToClipboard, formatNumber } from '@/utils';

import { usePearlWallet } from '../../PearlWalletProvider';
import { STEPS } from '../../types';

const { Title, Text, Paragraph } = Typography;

export const YouPayContainer = styled(Flex)`
  background: ${COLOR.BACKGROUND};
  border-radius: 10px;
  padding: 12px 16px;
`;

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

type TransferDetailsProps = { chainName: string; address?: Address };
const TransferDetails = ({ chainName, address }: TransferDetailsProps) => {
  const message = useMessageApi();

  const handleCopyAddress = useCallback(() => {
    if (!address) return;
    copyToClipboard(address).then(() => message.success('Address copied!'));
  }, [address, message]);

  return (
    <YouPayContainer vertical gap={24}>
      <Flex vertical gap={8}>
        <Text className="text-sm text-neutral-tertiary">On</Text>
        <Flex gap={8} align="center">
          <Image
            src={`/chains/${kebabCase(chainName)}-chain.png`}
            alt={chainName}
            width={20}
            height={20}
            className="flex"
          />
          <Text>{chainName} Chain</Text>
        </Flex>
      </Flex>

      <Flex vertical gap={8}>
        <Text className="text-sm text-neutral-tertiary">From</Text>
        <Flex gap={8} align="center">
          <WalletOutlined width={20} height={20} />
          <Text>Your external wallet</Text>
          <InfoCircleOutlined className="text-neutral-tertiary" />
        </Flex>
      </Flex>

      <Flex vertical gap={8}>
        <Text className="text-sm text-neutral-tertiary">To Pearl Wallet</Text>
        <Flex gap={8} align="center">
          <WalletOutlined width={20} height={20} />
          <Text>{address}</Text>
        </Flex>
        <Flex>
          <Button
            onClick={handleCopyAddress}
            size="small"
            icon={<CopyOutlined />}
          >
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
  const { amountsToDeposit, updateStep, walletChainId } = usePearlWallet();
  const { masterSafes } = useMasterWalletContext();

  const masterSafeAddress = useMemo(
    () =>
      masterSafes?.find((safe) => safe.evmChainId === walletChainId)?.address,
    [masterSafes, walletChainId],
  );

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
        <TransferDetails chainName={chainName} address={masterSafeAddress} />
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
