import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';

import { Divider } from '@/components/ui/Divider';

const { Text } = Typography;

export const PearlWalletToExternalWallet = () => (
  <Flex vertical style={{ margin: '0 -32px' }}>
    <Divider />
    <Flex gap={16} style={{ padding: '12px 32px' }}>
      <Text>
        <Text type="secondary">From</Text>{' '}
        <Text className="font-weight-500">Pearl Wallet</Text>
      </Text>
      <ArrowRightOutlined style={{ fontSize: 12 }} />
      <Text>
        <Text type="secondary">To</Text>{' '}
        <Text className="font-weight-500">External Wallet</Text>
      </Text>
    </Flex>
    <Divider />
  </Flex>
);
