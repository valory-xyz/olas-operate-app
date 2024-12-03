import { Flex, Skeleton, Tag, Typography } from 'antd';

import { NA } from '@/constants/symbols';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useReward } from '@/hooks/useReward';
import { balanceFormat } from '@/utils/numberFormatters';

import { CardSection } from '../../../styled/CardSection';
import { NotifyRewardsModal } from './NotifyRewardsModal';
import { RewardsStreak } from './RewardsStreak';
import { StakingRewardsThisEpoch } from './StakingRewardsThisEpoch';

const { Text } = Typography;

const Loader = () => (
  <Flex vertical gap={8}>
    <Skeleton.Button active size="small" style={{ width: 92 }} />
    <Skeleton.Button active size="small" style={{ width: 92 }} />
  </Flex>
);

const getFormattedReward = (reward: number | undefined) =>
  reward === undefined ? NA : `~${balanceFormat(reward, 2)}`;

const DisplayRewards = () => {
  const { availableRewardsForEpochEth, isEligibleForRewards } = useReward();
  const { isLoaded: isBalancesLoaded } = useBalanceContext();
  const reward = getFormattedReward(availableRewardsForEpochEth);

  return (
    <CardSection vertical gap={8} padding="16px 24px" align="start">
      <StakingRewardsThisEpoch />
      {isBalancesLoaded ? (
        <Flex align="center" gap={12}>
          <Text className="text-xl font-weight-600">{reward} OLAS&nbsp;</Text>
          {isEligibleForRewards ? (
            <Tag color="success">Earned</Tag>
          ) : (
            <Tag color="processing">Not yet earned</Tag>
          )}
        </Flex>
      ) : (
        <Loader />
      )}
    </CardSection>
  );
};

export const RewardsSection = () => {
  const isRewardsStreakEnabled = useFeatureFlag('rewards-streak');

  return (
    <>
      <DisplayRewards />
      {isRewardsStreakEnabled && <RewardsStreak />}
      <NotifyRewardsModal />
    </>
  );
};
