import { RightOutlined, ShareAltOutlined } from '@ant-design/icons';
import { Button, Flex, Skeleton, Tooltip, Typography } from 'antd';
import { useCallback } from 'react';
// import Image from 'next/image';
import styled from 'styled-components';

import { FireNoStreak } from '@/components/custom-icons/FireNoStreak';
import { FireStreak } from '@/components/custom-icons/FireStreak';
import { COLOR } from '@/constants/colors';
import { NA } from '@/constants/symbols';
import { OPERATE_URL } from '@/constants/urls';
import { Pages } from '@/enums/Pages';
import { useBalanceContext } from '@/hooks/useBalanceContext';
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
  const { isLoaded: isBalanceLoaded } = useBalanceContext();
  const { isEligibleForRewards } = useReward();
  const {
    latestRewardStreak: streak,
    isLoading: isRewardsHistoryLoading,
    isError,
  } = useRewardsHistory();

  // Graph does not account for the current day,
  // so we need to add 1 to the streak, if the user is eligible for rewards
  const optimisticStreak = isEligibleForRewards ? streak + 1 : streak;

  const onStreakShare = useCallback(() => {
    const encodedText = encodeURIComponent(
      `I've just completed a ${optimisticStreak}-day streak with my agent on Pearl and earned OLAS every single day! How long can you keep your streak going?`,
    );
    const encodedURL = encodeURIComponent(`${OPERATE_URL}?pearl=share-streak`);

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
          <Tooltip
            arrow={false}
            open
            title={
              <>
                Share streak on X
                {/* <Image
                  src="/twitter.svg"
                  width={24}
                  height={24}
                  alt="Share streak on twitter"
                /> */}
              </>
            }
            placement="top"
          >
            <Button
              type="link"
              onClick={onStreakShare}
              icon={
                <ShareAltOutlined
                  style={{ fontSize: '20px', color: COLOR.TEXT }}
                />
              }
              // iconPosition={position}
            />
          </Tooltip>
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
