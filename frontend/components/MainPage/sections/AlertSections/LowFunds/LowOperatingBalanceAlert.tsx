import { Flex, Typography } from 'antd';
import { useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { WalletType } from '@/enums/Wallet';
import {
  useMasterBalances,
  useServiceBalances,
} from '@/hooks/useBalanceContext';
import { useServices } from '@/hooks/useServices';
import { useStore } from '@/hooks/useStore';

import { InlineBanner } from './InlineBanner';
import { useLowFundsDetails } from './useLowFunds';

const { Text, Title } = Typography;

/**
 * Alert for low operating (safe) balance
 */
export const LowOperatingBalanceAlert = () => {
  const { storeState } = useStore();
  const { selectedAgentType, selectedService } = useServices();
  const { isLoaded: isBalanceLoaded, masterSafeNativeGasBalance } =
    useMasterBalances();
  const { serviceSafeBalances } = useServiceBalances(
    selectedService?.service_config_id,
  );

  const { chainName, tokenSymbol, masterSafeAddress, masterThresholds } =
    useLowFundsDetails();

  const agentSafeNativeBalance = useMemo(() => {
    if (!serviceSafeBalances) return;

    return serviceSafeBalances.find(({ symbol }) => symbol === tokenSymbol)
      ?.balance;
  }, [serviceSafeBalances, tokenSymbol]);

  const hasEnoughBalance = useMemo(() => {
    if (!masterSafeNativeGasBalance) return true;
    if (!agentSafeNativeBalance) return true;
    if (!masterThresholds) return true;

    const safeThreshold = masterThresholds[WalletType.Safe][tokenSymbol];

    // @note: Funds are transferred to the agent safe from the master safe.
    // Hence, if the agent safe has enough funds, it is considered as enough.
    return (
      masterSafeNativeGasBalance >= safeThreshold ||
      agentSafeNativeBalance >= safeThreshold
    );
  }, [
    masterSafeNativeGasBalance,
    masterThresholds,
    tokenSymbol,
    agentSafeNativeBalance,
  ]);

  if (!isBalanceLoaded) return null;
  if (!masterThresholds) return null;
  if (!storeState?.[`isInitialFunded_${selectedAgentType}`]) return;
  if (hasEnoughBalance) return null;

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
            <Text strong>{` ${
              masterThresholds[WalletType.Safe][tokenSymbol]
            } ${tokenSymbol} `}</Text>
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
