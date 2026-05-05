import { Button, Flex, Typography } from 'antd';
import { useMemo } from 'react';

import { Alert } from '@/components/ui';
import { PAGES } from '@/constants';
import { usePageState, useServiceBalances, useServices } from '@/hooks';

const { Text } = Typography;

export const UnderConstructionAlert = () => {
  const { goto } = usePageState();
  const { selectedService } = useServices();
  const {
    serviceSafeNativeBalances,
    serviceSafeErc20Balances,
    serviceEoaNativeBalance,
    serviceSafeOlas,
  } = useServiceBalances(selectedService?.service_config_id);

  const isWithdrawn = useMemo(() => {
    if (
      !serviceSafeErc20Balances ||
      !serviceSafeNativeBalances ||
      !serviceEoaNativeBalance ||
      !serviceSafeOlas
    )
      return false;

    const allNativeSafeZero = serviceSafeNativeBalances.every(
      (b) => b.balanceString === '0',
    );
    const allErc20SafeZero = serviceSafeErc20Balances.every(
      (b) => b.balanceString === '0',
    );
    const eoaNativeZero = serviceEoaNativeBalance.balanceString === '0';
    const safeOlasZero = serviceSafeOlas.balanceString === '0';

    return (
      allNativeSafeZero && allErc20SafeZero && eoaNativeZero && safeOlasZero
    );
  }, [
    serviceSafeNativeBalances,
    serviceSafeErc20Balances,
    serviceEoaNativeBalance,
    serviceSafeOlas,
  ]);

  return (
    <Alert
      type="warning"
      showIcon
      className="mt-16"
      message={
        <Flex align="center" gap={4}>
          <Text className="text-sm">
            The agent is temporarily disabled due to technical issues until
            further notice.
            {isWithdrawn ? null : ' You can withdraw your funds anytime.'}
          </Text>
          {isWithdrawn ? null : (
            <Button onClick={() => goto(PAGES.AgentWallet)} size="small">
              Withdraw
            </Button>
          )}
        </Flex>
      }
    />
  );
};
