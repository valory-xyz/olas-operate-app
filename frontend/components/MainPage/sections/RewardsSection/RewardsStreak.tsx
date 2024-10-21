import { RightOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import styled from 'styled-components';

import { FireNoStreak } from '@/components/custom-icons/FireNoStreak';
import { FireStreak } from '@/components/custom-icons/FireStreak';
import { Pages } from '@/enums/PageState';
import { usePageState } from '@/hooks/usePageState';
import { useReward } from '@/hooks/useReward';
import { useRewardsHistory } from '@/hooks/useRewardsHistory';

const { Text } = Typography;

const RewardsStreakFlex = styled(Flex)`
  padding: 8px 16px;
  background: #f2f4f9;
  border-radius: 6px;
  justify-content: space-between;
  height: 40px;
  align-items: center;
`;

const Streak = ({
  streak,
  isLoading,
}: {
  streak: number;
  isLoading: boolean;
}) => {
  const { isEligibleForRewards } = useReward();
  if (isLoading) return <div>Loading...</div>;

  // Graph does not account for the current day, so we need to add 1 to the streak
  const optimisticStreak = isEligibleForRewards ? streak + 1 : streak;

  const streakText =
    optimisticStreak > 0 ? `${optimisticStreak} day streak` : 'No streak';
  const streakIcon = optimisticStreak > 0 ? <FireStreak /> : <FireNoStreak />;

  return (
    <span style={{ display: 'inline-flex', gap: 8 }}>
      {streakIcon}
      {streakText}
    </span>
  );
};

export const RewardsStreak = () => {
  const { goto } = usePageState();
  const { latestRewardStreak, isLoading } = useRewardsHistory();

  return (
    <RewardsStreakFlex>
      <Streak streak={latestRewardStreak} isLoading={isLoading} />

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
