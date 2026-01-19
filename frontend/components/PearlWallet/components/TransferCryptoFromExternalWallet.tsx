import { Button, Flex, TableColumnsType, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { LuInfo } from 'react-icons/lu';
import { styled } from 'styled-components';

import {
  Alert,
  BackButton,
  CardFlex,
  FundingDescription,
  Table,
} from '@/components/ui';
import { TokenSymbolConfigMap } from '@/config/tokens';
import { COLOR } from '@/constants';
import { Address, AvailableAsset, Nullable } from '@/types';
import { formatAmount } from '@/utils';

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
        <Text>{formatAmount(record.amount, 4)}</Text>
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
      {address && (
        <FundingDescription
          address={address}
          chainName={chainName}
          chainImage={`/chains/${kebabCase(chainName)}-chain.png`}
        />
      )}
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
