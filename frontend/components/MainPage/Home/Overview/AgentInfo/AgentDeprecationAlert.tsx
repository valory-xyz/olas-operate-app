import { Button, Flex, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { PAGES } from '@/constants';
import { usePageState } from '@/hooks';

const { Text } = Typography;

export const AgentDeprecationAlert = ({
  shutdownDate,
}: {
  shutdownDate: string;
}) => {
  const { goto } = usePageState();

  return (
    <Alert
      type="warning"
      showIcon
      className="mt-16"
      message={
        <Flex align="center" gap={4}>
          <Text className="text-sm">
            PettBro is being phased out and will be disabled on {shutdownDate}.
            You can withdraw funds from the Agent Wallet.
          </Text>
          <Button onClick={() => goto(PAGES.AgentWallet)} size="small">
            Withdraw
          </Button>
        </Flex>
      }
    />
  );
};
