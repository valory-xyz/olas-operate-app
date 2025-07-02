import { Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { Pages } from '@/enums/Pages';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { usePageState } from '@/hooks/usePageState';
import { Optional } from '@/types/Util';

import { InlineBanner } from './InlineBanner';
import { useLowFundsDetails } from './useLowFunds';

const { Text, Title } = Typography;

type LowSafeSignerBalanceAlert = { requiredSignerFunds: Optional<number> };

/**
 * Alert for low safe signer (EOA) balance
 */
export const LowSafeSignerBalanceAlert = ({
  requiredSignerFunds,
}: LowSafeSignerBalanceAlert) => {
  const isBridgeAddFundsEnabled = useFeatureFlag('bridge-add-funds');
  const { goto } = usePageState();

  const { chainName, tokenSymbol, masterEoaAddress } = useLowFundsDetails();

  return (
    <CustomAlert
      fullWidth
      type="error"
      showIcon
      message={
        <Flex vertical gap={8} align="flex-start">
          <Title level={5} style={{ margin: 0 }}>
            Safe signer balance is too low
          </Title>
          <Text>
            To keep your agent operational, add
            <Text strong>{` ${requiredSignerFunds} ${tokenSymbol} `}</Text>
            on {chainName} chain to the safe signer.
          </Text>
          <Text>
            Your agent is at risk of missing its targets, which would result in
            several days&apos; suspension.
          </Text>

          {masterEoaAddress && (
            <InlineBanner
              text="Safe signer address"
              address={masterEoaAddress}
              bridgeFunds={
                isBridgeAddFundsEnabled
                  ? {
                      chainName,
                      goto: () => goto(Pages.LowSafeSignerBalanceBridgeFunds),
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
