import { RightOutlined } from '@ant-design/icons';
import { Flex, Skeleton, Typography } from 'antd';
import styled from 'styled-components';

import { FireNoStreak } from '@/components/custom-icons/FireNoStreak';
import { FireStreak } from '@/components/custom-icons/FireStreak';
import { COLOR } from '@/constants/colors';
import { NA } from '@/constants/symbols';
import { Pages } from '@/enums/PageState';
import { useBalance } from '@/hooks/useBalance';
import { usePageState } from '@/hooks/usePageState';
import { useReward } from '@/hooks/useReward';
import { useRewardsHistory } from '@/hooks/useRewardsHistory';

const { Text } = Typography;

const RewardsStreakFlex = styled(Flex)`
  padding: 8px 16px;
  height: 40px;
  background: ${COLOR.GRAY_1};
  border-radius: 6px;
`;

const Streak = () => {
  const { isBalanceLoaded } = useBalance();
  const { isEligibleForRewards } = useReward();
  const {
    latestRewardStreak: streak,
    isLoading,
    isFetching,
    isError,
  } = useRewardsHistory();

  if (isLoading || isFetching || !isBalanceLoaded) {
    return <Skeleton.Input active size="small" />;
  }

  if (isError) {
    return NA;
  }

  // Graph does not account for the current day,
  // so we need to add 1 to the streak, if the user is eligible for rewards
  const optimisticStreak = isEligibleForRewards ? streak + 1 : streak;

  return (
    <Flex gap={6}>
      {optimisticStreak > 0 ? (
        <>
          <FireStreak /> {optimisticStreak} day streak
        </>
      ) : (
        <>
          <FireNoStreak /> No streak
        </>
      )}
    </Flex>
  );
};

export const RewardsStreak = () => {
  const { goto } = usePageState();

  return (
    <RewardsStreakFlex align="center" justify="space-between">
      <Streak />

      <Text
        type="secondary"
        className="text-sm pointer hover-underline"
        onClick={() => goto(Pages.RewardsHistory)}
      >
        See rewards history
        <RightOutlined style={{ fontSize: 12, paddingLeft: 6 }} />
      </Text>
    </RewardsStreakFlex>
  );
};
