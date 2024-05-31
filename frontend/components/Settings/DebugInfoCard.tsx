import { CopyOutlined } from '@ant-design/icons';
import {
  Button,
  Col,
  Flex,
  message,
  Modal,
  Row,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { balanceFormat, copyToClipboard, truncateAddress } from '@/common-util';
import { COLOR } from '@/constants';
import { UNICODE_SYMBOLS } from '@/constants/unicode';
import { Token } from '@/enums';
import { useBalance, useServices } from '@/hooks';
import { useWallet } from '@/hooks/useWallet';
import { WalletAddressNumberRecord } from '@/types';

import { CardSection } from '../styled/CardSection';

const { Text, Title } = Typography;

const DebugModal = styled(Modal)`
  top: 24px;
  height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;

  .ant-modal-content {
    height: calc(100vh - 48px);
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  .ant-modal-header {
    padding: 16px 24px;
    margin: 0;
    border-bottom: 1px solid ${COLOR.BORDER_GRAY};
  }

  .ant-modal-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
    border-radius: 12px;
  }
`;

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
    balance: Record<Token.ETH | Token.OLAS, string>;
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
            <Text>{item.balance.ETH} XDAI</Text>
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
                href={`https://gnosisscan.io/address/${item.address}`}
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

export const DebugInfoCard = () => {
  const { wallets, masterEoaAddress, masterSafeAddress } = useWallet();
  const { services } = useServices();
  const { walletBalances } = useBalance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const showModal = useCallback(() => setIsModalOpen(true), []);
  const handleCancel = useCallback(() => setIsModalOpen(false), []);

  const data = useMemo(() => {
    if (!services) return null;
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

    if (services[0]?.chain_data?.instances?.[0]) {
      const instanceAddress = services[0].chain_data.instances[0];
      result.push({
        title: 'Agent instance',
        ...getItemData(walletBalances, instanceAddress),
      });
    }

    if (services[0]?.chain_data?.multisig) {
      const multisigAddress = services[0].chain_data.multisig;
      result.push({
        title: 'Agent Safe',
        ...getItemData(walletBalances, multisigAddress),
        link: {
          title: 'See agent activity on Pandora',
          href: `https://pandora.computer/predict/${multisigAddress}`,
        },
      });
    }

    return result;
  }, [
    masterEoaAddress,
    masterSafeAddress,
    services,
    walletBalances,
    wallets?.length,
  ]);

  return (
    <CardSection vertical gap={8} align="start">
      <Text strong>Debug data (for devs)</Text>
      <Button type="primary" ghost size="large" onClick={showModal}>
        Show debug data
      </Button>
      <DebugModal
        title="Debug data"
        open={isModalOpen}
        footer={null}
        width={412}
        onCancel={handleCancel}
      >
        {data ? (
          data.map((item) => <DebugItem key={item.address} item={item} />)
        ) : (
          <Flex justify="center" align="center" flex="auto">
            <Spin size="large" />
          </Flex>
        )}
      </DebugModal>
    </CardSection>
  );
};
