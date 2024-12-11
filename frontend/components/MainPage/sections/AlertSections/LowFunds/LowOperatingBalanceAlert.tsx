import { Flex, Typography } from 'antd';
import { useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { LOW_MASTER_SAFE_BALANCE } from '@/constants/thresholds';
import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useStore } from '@/hooks/useStore';

import { InlineBanner } from './InlineBanner';
import { useLowFundsDetails } from './useLowFunds';

const { Text, Title } = Typography;

export const LowOperatingBalanceAlert = () => {
  const { storeState } = useStore();
  const { isLoaded: isBalanceLoaded, masterSafeNativeGasBalance } =
    useMasterBalances();

  const { chainName, tokenSymbol, masterSafeAddress } = useLowFundsDetails();

  const isLowBalance = useMemo(() => {
    if (!masterSafeNativeGasBalance) return false;
    return masterSafeNativeGasBalance < LOW_MASTER_SAFE_BALANCE;
  }, [masterSafeNativeGasBalance]);

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
            Operating balance is too low
          </Title>
          <Text>
            To run your agent, add at least
            <Text strong>{` ${LOW_MASTER_SAFE_BALANCE} ${tokenSymbol} `}</Text>
            on {chainName} chain to your safe.
          </Text>
          <Text>
            Your agent is at risk of missing its targets, which would result in
            several days&apos; suspension.
          </Text>

          {masterSafeAddress && (
            <InlineBanner
              text="Your safe address"
              address={masterSafeAddress}
            />
          )}
        </Flex>
      }
    />
  );
};
