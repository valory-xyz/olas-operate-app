import { CopyOutlined } from '@ant-design/icons';
import {
  Button,
  Col,
  Flex,
  message,
  Row,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { MiddlewareChain } from '@/client';
import { COLOR } from '@/constants/colors';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { EXPLORER_URL } from '@/constants/urls';
import { MODAL_WIDTH } from '@/constants/width';
import { TokenSymbol } from '@/enums/Token';
import { useAddress } from '@/hooks/useAddress';
import { useBalance } from '@/hooks/useBalance';
import { useWallet } from '@/hooks/useWallet';
import { WalletAddressNumberRecord } from '@/types/Records';
import { copyToClipboard } from '@/utils/copyToClipboard';
import { balanceFormat } from '@/utils/numberFormatters';
import { truncateAddress } from '@/utils/truncate';

import { CardSection } from '../styled/CardSection';
import { CustomModal } from '../styled/CustomModal';

const { Text, Title } = Typography;

const Card = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid ${COLOR.BORDER_GRAY};
`;

const ICON_STYLE = { color: '#606F85' };

const getItemData = (
  walletBalances: WalletAddressNumberRecord,
  address: `0x${string}`,
) => ({
  balance: {
    OLAS: balanceFormat(walletBalances[address]?.OLAS, 2),
    ETH: balanceFormat(walletBalances[address]?.ETH, 2),
  },
  address: address,
  truncatedAddress: address ? truncateAddress(address) : '',
});

const DebugItem = ({
  item,
}: {
  item: {
    title: string;
    balance: Record<TokenSymbol.ETH | TokenSymbol.OLAS, string>;
    address: `0x${string}`;
    truncatedAddress: string;
    link?: { title: string; href: string };
  };
}) => {
  const onCopyToClipboard = useCallback(
    () =>
      copyToClipboard(item.address).then(() =>
        message.success('Address copied!'),
      ),
    [item.address],
  );

  return (
    <Card>
      <Title level={5} className="m-0 mb-8 text-base">
        {item.title}
      </Title>
      <Row>
        <Col span={12}>
          <Flex vertical gap={4} align="flex-start">
            <Text type="secondary" className="text-sm">
              Balance
            </Text>
            <Text>{item.balance.OLAS} OLAS</Text>
            <Text>{item.balance.ETH} ETH</Text>
            {/* <Text>{item.balance.USDC} USDC</Text> */}
          </Flex>
        </Col>

        <Col span={12}>
          <Flex vertical gap={4} align="flex-start">
            <Text type="secondary" className="text-sm">
              Address
            </Text>
            <Flex gap={12}>
              <a
                target="_blank"
                href={`${EXPLORER_URL[MiddlewareChain.OPTIMISM]}/address/${item.address}`}
              >
                {item.truncatedAddress}
              </a>
              <Tooltip title="Copy to clipboard">
                <CopyOutlined style={ICON_STYLE} onClick={onCopyToClipboard} />
              </Tooltip>
            </Flex>
          </Flex>
        </Col>
      </Row>
      {item.link ? (
        <Row className="mt-8">
          <a target="_blank" href={item.link.href}>
            {item.link.title} {UNICODE_SYMBOLS.EXTERNAL_LINK}
          </a>
        </Row>
      ) : null}
    </Card>
  );
};

export const DebugInfoSection = () => {
  const { wallets, masterEoaAddress, masterSafeAddress } = useWallet();
  const { instanceAddress, multisigAddress } = useAddress();
  const { walletBalances } = useBalance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const showModal = useCallback(() => setIsModalOpen(true), []);
  const handleCancel = useCallback(() => setIsModalOpen(false), []);

  const data = useMemo(() => {
    if (!wallets?.length) return null;

    const result = [];

    if (masterEoaAddress) {
      result.push({
        title: 'Master EOA',
        ...getItemData(walletBalances, masterEoaAddress),
      });
    }

    if (masterSafeAddress) {
      result.push({
        title: 'Master Safe',
        ...getItemData(walletBalances, masterSafeAddress),
      });
    }

    if (instanceAddress) {
      result.push({
        title: 'Agent Instance EOA',
        ...getItemData(walletBalances, instanceAddress!),
      });
    }

    if (multisigAddress) {
      result.push({
        title: 'Agent Safe',
        ...getItemData(walletBalances, multisigAddress),
      });
    }

    return result;
  }, [
    masterEoaAddress,
    masterSafeAddress,
    instanceAddress,
    multisigAddress,
    walletBalances,
    wallets?.length,
  ]);

  return (
    <CardSection vertical gap={8} align="start" padding="24px">
      <Text strong>Debug data (for devs)</Text>
      <Button type="primary" ghost size="large" onClick={showModal}>
        Show debug data
      </Button>
      <CustomModal
        title="Debug data"
        open={isModalOpen}
        footer={null}
        width={MODAL_WIDTH}
        onCancel={handleCancel}
      >
        {data ? (
          data.map((item) => <DebugItem key={item.address} item={item} />)
        ) : (
          <Flex justify="center" align="center" flex="auto">
            <Spin size="large" />
          </Flex>
        )}
      </CustomModal>
    </CardSection>
  );
};
