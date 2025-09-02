import { Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { Pages } from '@/enums/Pages';
import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useStore } from '@/hooks/useStore';

import { InlineBanner } from './InlineBanner';
import { useLowFundsDetails } from './useLowFunds';

const { Text, Title } = Typography;

/**
 * Alert for low operating (safe) balance
 */
export const LowOperatingBalanceAlert = () => {
  const isBridgeAddFundsEnabled = useFeatureFlag('bridge-add-funds');
  const { goto } = usePageState();
  const { storeState } = useStore();
  const { selectedAgentType } = useServices();
  const { isMasterSafeLowOnNativeGas, masterSafeNativeGasRequirement } =
    useMasterBalances();

  const { chainName, tokenSymbol, masterSafeAddress } = useLowFundsDetails();

  if (!storeState?.[selectedAgentType]?.isInitialFunded) return;
  if (!isMasterSafeLowOnNativeGas) return null;

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
            <Text
              strong
            >{` ${masterSafeNativeGasRequirement} ${tokenSymbol} `}</Text>
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
              bridgeFunds={
                isBridgeAddFundsEnabled
                  ? {
                      chainName,
                      goto: () => goto(Pages.LowOperatingBalanceBridgeFunds),
                    }
                  : undefined
              }
            />
          )}
        </Flex>
      }
    />
  );
};
