import { RightOutlined } from '@ant-design/icons';
import { Flex, Skeleton, Typography } from 'antd';
import styled from 'styled-components';

import { FireNoStreak } from '@/components/custom-icons/FireNoStreak';
import { FireStreak } from '@/components/custom-icons/FireStreak';
import { COLOR } from '@/constants/colors';
import { NA } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { usePageState } from '@/hooks/usePageState';
import { useReward } from '@/hooks/useReward';
import { useRewardsHistory } from '@/hooks/useRewardsHistory';
import { useServices } from '@/hooks/useServices';

const { Text } = Typography;

const RewardsStreakFlex = styled(Flex)`
  padding: 8px 16px;
  height: 40px;
  background: ${COLOR.GRAY_1};
  border-radius: 6px;
`;

const Streak = () => {
  const { isLoading: isServicesLoading } = useServices();
  const { isLoaded: isBalanceLoaded } = useBalanceContext();
  const { isEligibleForRewards } = useReward();
  const {
    latestRewardStreak: streak,
    isFetched: isRewardsHistoryFetched,
    isError,
  } = useRewardsHistory();

  // If services are loading for the first time (e.g. right after opening the app)
  // or rewards history or balances are not fetched yet - show loading state
  if (isServicesLoading || !isRewardsHistoryFetched || !isBalanceLoaded) {
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
