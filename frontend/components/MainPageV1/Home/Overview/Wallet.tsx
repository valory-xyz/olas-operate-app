import { Button, Flex, Skeleton, Statistic, Typography } from 'antd';
import { useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { Clock } from '@/components/custom-icons/Clock';
import { FireNoStreak } from '@/components/custom-icons/FireNoStreak';
import { FireV1 } from '@/components/custom-icons/FireV1';
import { CardFlex } from '@/components/ui/CardFlex';
import { NA, UNICODE_SYMBOLS } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useStakingDetails } from '@/hooks/useStakingDetails';

const { Text, Title } = Typography;
const { Countdown } = Statistic;

const LowPearlWalletBalance = () => (
  <CustomAlert
    showIcon
    type="error"
    message={
      <>
        <Text className="text-sm font-weight-500">
          Low Pearl Wallet Balance
        </Text>
        <Text className="text-sm flex mt-4 mb-8">
          To continue using Pearl without interruption, deposit on your Pearl
          Wallet the amounts below.
        </Text>
        <Flex vertical gap={4} className="mb-8">
          <Text>{UNICODE_SYMBOLS.BULLET} 2.5 XDAI · Gnosis</Text>
          <Text>{UNICODE_SYMBOLS.BULLET} 0.0005 ETH · Optimism</Text>
          <Text>{UNICODE_SYMBOLS.BULLET} 0.0005 ETH · Mode</Text>
        </Flex>

        {/* TODO */}
        <Button size="small" disabled>
          Deposit
        </Button>
      </>
    }
  />
);

const Streak = () => {
  const { isStreakLoading, isStreakError, optimisticStreak, fireColor } =
    useStakingDetails();

  if (isStreakLoading) return <Skeleton.Input active size="small" />;
  if (isStreakError) return NA;
  return (
    <Flex gap={6} align="center">
      {optimisticStreak === 0 ? (
        <>
          <FireNoStreak /> No streak
        </>
      ) : (
        <>
          <FireV1 fill={fireColor} />
          {optimisticStreak}
        </>
      )}
    </Flex>
  );
};

const showAlert = true;

/**
 * To display current epoch lifetime, streak, and relevant alerts.
 */
export const Wallet = () => {
  const { goto } = usePageState();
  const { currentEpochLifetime } = useStakingDetails();

  // TODO
  const alert = useMemo(() => {
    if (showAlert) return <LowPearlWalletBalance />;
    return null;
  }, []);

  return (
    <Flex vertical>
      <Flex justify="space-between" align="center">
        <Title level={4}>Wallet</Title>
        <Button size="small" onClick={() => goto(Pages.PearlWallet)}>
          Manage Wallet
        </Button>
      </Flex>

      <CardFlex $noBorder>
        <Flex vertical gap={24}>
          {alert}
          <Flex flex={1}>
            <Flex flex={1} vertical gap={4}>
              <Text type="secondary">Current Epoch lifetime</Text>
              <Flex align="center" gap={8}>
                <Clock />
                {currentEpochLifetime ? (
                  <Countdown
                    value={currentEpochLifetime}
                    valueStyle={{ fontSize: 16 }}
                  />
                ) : (
                  <Text>Soon</Text>
                )}
              </Flex>
            </Flex>
            <Flex flex={1} vertical gap={4}>
              <Text type="secondary">Streak</Text>
              <Streak />
            </Flex>
          </Flex>
        </Flex>
      </CardFlex>
    </Flex>
  );
};
