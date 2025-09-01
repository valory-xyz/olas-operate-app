import { ShareAltOutlined } from '@ant-design/icons';
import { Button, Flex, Skeleton, Tooltip } from 'antd';
import { useCallback } from 'react';

import { FireNoStreak } from '@/components/custom-icons/FireNoStreak';
import { FireStreak } from '@/components/custom-icons/FireStreak';
import { COLOR } from '@/constants/colors';
import { NA } from '@/constants/symbols';
import { PEARL_URL } from '@/constants/urls';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useRewardsHistory } from '@/hooks/useRewardsHistory';

const NoStreak = () => (
  <>
    <FireNoStreak /> No streak
  </>
);

export const Streak = () => {
  const { isLoaded: isBalanceLoaded } = useBalanceContext();
  const { isEligibleForRewards } = useRewardContext();
  const {
    latestRewardStreak: streak,
    isLoading: isRewardsHistoryLoading,
    isError,
  } = useRewardsHistory();

  // Graph does not account for the current day,
  // so we need to add 1 to the streak, if the user is eligible for rewards
  const optimisticStreak = (isEligibleForRewards ? streak + 1 : streak) + 10;

  const onStreakShare = useCallback(() => {
    const encodedText = encodeURIComponent(
      `🎉 I've just completed a ${optimisticStreak}-day streak with my agent on Pearl and earned OLAS every single day! 🏆 How long can you keep your streak going? \n\nDownload the Pearl app:`,
    );
    const encodedURL = encodeURIComponent(`${PEARL_URL}?pearl=share-streak`);

    window.open(
      `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedURL}`,
      '_blank',
    );
  }, [optimisticStreak]);

  // If rewards history is loading for the first time
  // or balances are not fetched yet - show loading state
  if (isRewardsHistoryLoading || !isBalanceLoaded) {
    return <Skeleton.Input active size="small" />;
  }

  if (isError) {
    return NA;
  }

  return (
    <Flex gap={6} align="center">
      {optimisticStreak > 0 ? (
        <>
          <FireStreak /> {optimisticStreak} day streak
          <Tooltip arrow={false} title="Share streak on X" placement="top">
            <Button
              type="link"
              onClick={onStreakShare}
              icon={
                <ShareAltOutlined
                  style={{ fontSize: '20px', color: COLOR.GRAY_2 }}
                />
              }
            />
          </Tooltip>
        </>
      ) : (
        <NoStreak />
      )}
    </Flex>
  );
};
