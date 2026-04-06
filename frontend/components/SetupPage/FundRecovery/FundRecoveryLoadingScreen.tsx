import { Flex, Spin, Typography } from 'antd';

const { Text } = Typography;

type FundRecoveryLoadingScreenProps = {
  message?: string;
};

export const FundRecoveryLoadingScreen = ({
  message = 'Recovering funds, please wait...',
}: FundRecoveryLoadingScreenProps) => (
  <Flex
    vertical
    align="center"
    justify="center"
    gap={16}
    style={{ minHeight: 200 }}
  >
    <Spin size="large" />
    <Text type="secondary">{message}</Text>
  </Flex>
);
