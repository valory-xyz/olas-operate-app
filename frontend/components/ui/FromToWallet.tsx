import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import { isValidElement, ReactNode } from 'react';

import { Maybe } from '@/types/Util';

import { Divider } from './Divider';

const { Text } = Typography;

type PearlWalletToAgentWalletProps = {
  from: string;
  to: string;
  fromExtra?: Maybe<ReactNode>;
  toExtra?: Maybe<ReactNode>;
};

export const FromToWallet = ({
  from,
  to,
  fromExtra = null,
  toExtra = null,
}: PearlWalletToAgentWalletProps) => (
  <Flex vertical style={{ margin: '0 -32px' }}>
    <Divider className="m-0" />
    <Flex gap={16} style={{ padding: '12px 32px' }} align="center">
      <Text>
        <Text type="secondary">From</Text>{' '}
        {isValidElement(fromExtra) ? fromExtra : null}
        <Text className="font-weight-500">{from}</Text>
      </Text>
      <ArrowRightOutlined style={{ fontSize: 12 }} />
      <Flex gap={8} align="center">
        <Text type="secondary">To</Text>{' '}
        {isValidElement(toExtra) ? toExtra : null}
        <Text className="font-weight-500">{to}</Text>
      </Flex>
    </Flex>
    <Divider className="m-0" />
  </Flex>
);
