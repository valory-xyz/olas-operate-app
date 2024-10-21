import { Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { LOW_MASTER_SAFE_BALANCE } from '@/constants/thresholds';
import { useBalance } from '@/hooks/useBalance';
import { useStore } from '@/hooks/useStore';

const { Text, Title } = Typography;

export const LowTradingBalanceAlert = () => {
  const { isBalanceLoaded, isLowBalance } = useBalance();
  const { storeState } = useStore();

  if (!isBalanceLoaded) return null;
  if (!storeState?.isInitialFunded) return;
  if (!isLowBalance) return null;

  return (
    <CustomAlert
      fullWidth
      type="error"
      showIcon
      message={
        <Flex vertical gap={8} align="flex-start">
          <Title level={5} style={{ margin: 0 }}>
            Trading balance is too low
          </Title>
          <Text>
            {`To run your agent, add at least $${LOW_MASTER_SAFE_BALANCE} XDAI to your account.`}
          </Text>
          <Text>
            Your agent is at risk of missing its targets, which would result in
            several days&apos; suspension.
          </Text>
        </Flex>
      }
    />
  );
};
