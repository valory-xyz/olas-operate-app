import { Button, Flex, Typography } from 'antd';

import { STEPS } from '@/components/AgentWallet/types';
import { Alert } from '@/components/ui';
import { PAGES } from '@/constants';
import { usePageState } from '@/hooks';

const { Text } = Typography;

export const AgentDecommissionedAlert = () => {
  const { goto } = usePageState();

  return (
    <Alert
      type="warning"
      showIcon
      className="mt-16"
      message={
        <Flex align="center" gap={4}>
          <Text className="text-sm">
            PettBro agent has been phased out and is no longer supported. You can
            still withdraw funds from your Agent Wallet.
          </Text>
          <Button
            onClick={() =>
              goto(PAGES.AgentWallet, {
                initialStep: STEPS.WITHDRAW_FROM_AGENT_WALLET,
              })
            }
            size="small"
          >
            Withdraw
          </Button>
        </Flex>
      }
    />
  );
};
