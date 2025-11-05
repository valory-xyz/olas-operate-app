import { Button, Flex, TableColumnsType, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { useCallback } from 'react';
import { LuInfo } from 'react-icons/lu';
import { TbCopy, TbWallet } from 'react-icons/tb';
import { styled } from 'styled-components';

import {
  Alert,
  BackButton,
  CardFlex,
  InfoTooltip,
  Table,
} from '@/components/ui';
import { COLOR, TokenSymbolConfigMap } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import { Address, AvailableAsset, Nullable } from '@/types';
import { copyToClipboard, formatNumber } from '@/utils';

const { Title, Text, Paragraph } = Typography;

export const YouPayContainer = styled(Flex)`
  background: ${COLOR.BACKGROUND};
  border-radius: 10px;
  padding: 12px 16px;
`;

const ChainWarningAlert = ({ chainName }: { chainName: string }) => (
  <Alert
    message={`Only send on ${chainName} Chain — funds on other networks are unrecoverable.`}
    type="warning"
    showIcon
    className="text-sm"
    style={{ padding: '10px 12px' }}
  />
);

const DoesNotTrackIncomingTransfers = () => (
  <Flex align="start" gap={8}>
    <LuInfo size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
    <Paragraph className="text-sm m-0 text-neutral-tertiary">
      This screen doesn’t track incoming transfers. To verify, review the Pearl
      Wallet balance or transaction history.
    </Paragraph>
  </Flex>
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
          />
          <Text>{chainName} Chain</Text>
        </Flex>
      </Flex>

      <Flex vertical gap={8}>
        <Text className="text-sm text-neutral-tertiary">From</Text>
        <Flex gap={8} align="center">
          <TbWallet size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
          <Text>Your external wallet</Text>
          <InfoTooltip placement="top" iconColor={COLOR.BLACK}>
            <Paragraph className="text-sm m-0">
              This is the wallet you use outside Pearl
            </Paragraph>
          </InfoTooltip>
        </Flex>
      </Flex>

      <Flex vertical gap={8}>
        <Text className="text-sm text-neutral-tertiary">To Pearl Wallet</Text>
        <Flex gap={8} align="center">
          <TbWallet size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
          <Text>{address}</Text>
        </Flex>
        <Flex>
          <Button onClick={handleCopyAddress} size="small" icon={<TbCopy />}>
            Copy
          </Button>
        </Flex>
      </Flex>
    </YouPayContainer>
  );
};

const getColumns = (
  requestedColumnText = 'Requested Deposit Amount',
): TableColumnsType<AvailableAsset> =>
  [
    {
      title: 'Token',
      key: 'token',
      render: (_: unknown, record: AvailableAsset) => (
        <Flex align="center" gap={8}>
          <Image
            src={TokenSymbolConfigMap[record.symbol].image}
            alt={record.symbol}
            width={20}
            height={20}
          />
          <Text>{record.symbol}</Text>
        </Flex>
      ),
      width: '50%',
    },
    {
      title: requestedColumnText,
      key: 'tokenAmount',
      render: (_: unknown, record: AvailableAsset) => (
        <Text>{formatNumber(record.amount, 4)}</Text>
      ),
      width: '50%',
    },
  ] as const;

type TransferCryptoOnProps = {
  chainName: string;
  address: Nullable<Address>;
  tokensToDeposit: AvailableAsset[];
  onBack: () => void;
  onBackToPearlWallet: () => void;
  description?: string;
  /** Optional custom text for the "Requested Deposit Amount" column */
  requestedColumnText?: string;
};

/**
 * To transfer crypto to the Pearl Wallet, display the address and required amounts.
 * NOTE: This component does not handle the actual transfer success/failure.
 */
export const TransferCryptoFromExternalWallet = ({
  chainName,
  address,
  tokensToDeposit,
  onBack,
  onBackToPearlWallet,
  description,
  requestedColumnText,
}: TransferCryptoOnProps) => (
  <CardFlex $noBorder $padding="32px" style={{ width: 624, margin: '0 auto' }}>
    <Flex vertical gap={24}>
      <Flex vertical gap={16}>
        <BackButton onPrev={onBack} />
        <Title className="m-0" level={3}>
          Transfer Crypto on {chainName}
        </Title>
        <Paragraph className="m-0 text-neutral-secondary">
          {description}
        </Paragraph>
      </Flex>

      <ChainWarningAlert chainName={chainName} />
      {address && <TransferDetails chainName={chainName} address={address} />}
      <Table<AvailableAsset>
        dataSource={tokensToDeposit}
        columns={getColumns(requestedColumnText)}
        rowKey={(record) => record.symbol}
        pagination={false}
        rowHoverable={false}
        locale={{ emptyText: 'No tokens to deposit.' }}
      />

      <DoesNotTrackIncomingTransfers />
      <Button onClick={onBackToPearlWallet} size="large">
        Back to Pearl Wallet
      </Button>
    </Flex>
  </CardFlex>
);
