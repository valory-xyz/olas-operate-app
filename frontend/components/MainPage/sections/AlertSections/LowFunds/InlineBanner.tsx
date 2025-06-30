import { CopyOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { ReactNode } from 'react';
import styled, { CSSProperties } from 'styled-components';

import { COLOR } from '@/constants/colors';
import { Address } from '@/types/Address';
import { copyToClipboard } from '@/utils/copyToClipboard';
import { truncateAddress } from '@/utils/truncate';

const { Text } = Typography;

const InlineBannerContainer = styled(Flex)`
  width: 100%;
  margin-top: 8px;
  background-color: ${COLOR.WHITE};
  color: ${COLOR.TEXT};
  border-radius: 8px;
  box-sizing: border-box;
  box-shadow:
    0px 1px 2px 0px rgba(0, 0, 0, 0.03),
    0px 1px 6px -1px rgba(0, 0, 0, 0.02),
    0px 2px 4px 0px rgba(0, 0, 0, 0.02);
`;

const rowCommonStyle: CSSProperties = {
  padding: '8px 12px',
};

type InlineBannerProps = {
  text: string;
  address: Address;
  extra?: ReactNode;
  bridgeFunds?: { chainName: string; goto: () => void };
};

export const InlineBanner = ({
  text,
  address,
  extra,
  bridgeFunds,
}: InlineBannerProps) => {
  return (
    <InlineBannerContainer vertical>
      <Flex justify="space-between" align="center" style={rowCommonStyle}>
        <Text strong>{text}</Text>
        <Flex gap={12}>
          <Text>{truncateAddress(address)}</Text>
          <Button size="small" onClick={() => copyToClipboard(address)}>
            <CopyOutlined />
          </Button>
        </Flex>
      </Flex>

      {extra && (
        <Flex
          justify="space-between"
          style={{
            borderTop: `1px solid ${COLOR.BORDER_GRAY}`,
            ...rowCommonStyle,
          }}
        >
          {extra}
        </Flex>
      )}

      {bridgeFunds && (
        <Flex
          justify="space-between"
          style={{
            borderTop: `1px solid ${COLOR.BORDER_GRAY}`,
            ...rowCommonStyle,
          }}
        >
          <Text>{`Don’t have assets on ${bridgeFunds.chainName}?`}</Text>
          <Button size="small" onClick={bridgeFunds.goto}>
            Bridge funds
          </Button>
        </Flex>
      )}
    </InlineBannerContainer>
  );
};
