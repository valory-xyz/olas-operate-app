import { CopyOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { Address } from '@/types/Address';
import { copyToClipboard } from '@/utils/copyToClipboard';
import { truncateAddress } from '@/utils/truncate';

const { Text } = Typography;

const InlineBannerContainer = styled(Flex)`
  width: 100%;
  margin-top: 8px;
  padding: 8px 8px 8px 12px;
  background-color: ${COLOR.WHITE};
  color: ${COLOR.TEXT};
  border-radius: 8px;
  box-sizing: border-box;
  box-shadow:
    0px 1px 2px 0px rgba(0, 0, 0, 0.03),
    0px 1px 6px -1px rgba(0, 0, 0, 0.02),
    0px 2px 4px 0px rgba(0, 0, 0, 0.02);
`;

type InlineBannerProps = { text: string; address: Address };

export const InlineBanner = ({ text, address }: InlineBannerProps) => {
  return (
    <InlineBannerContainer justify="space-between" align="center">
      <Text>{text}</Text>
      <Flex gap={12}>
        <Text>{truncateAddress(address)}</Text>
        <Button size="small" onClick={() => copyToClipboard(address)}>
          <CopyOutlined />
        </Button>
      </Flex>
    </InlineBannerContainer>
  );
};
