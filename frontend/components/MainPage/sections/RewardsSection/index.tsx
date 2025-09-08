import { Flex, Skeleton, Tag, Typography } from 'antd';
import { AnimatePresence, HTMLMotionProps, motion } from 'framer-motion';
import { useMemo } from 'react';
import styled from 'styled-components';

import { NA } from '@/constants/symbols';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { balanceFormat } from '@/utils/numberFormatters';

import { CardSection } from '../../../ui/CardSection';
import { NotifyRewardsModal } from './NotifyRewardsModal';
import { RewardsStreak } from './RewardsStreak';
import { StakingRewardsThisEpoch } from './StakingRewardsThisEpoch';

const { Text } = Typography;

const TodayRewardsLoader = () => (
  <Skeleton.Button
    active
    size="small"
    style={{ position: 'relative', top: -2, width: 60 }}
  />
);

const TagLoader = () => (
  <Skeleton.Input size="small" style={{ position: 'relative', top: 12 }} />
);

// Common motion props for the earned tag
const commonMotionProps: HTMLMotionProps<'div'> = {
  initial: 'initial',
  animate: 'animate',
  exit: 'exit',
  variants: {
    initial: { y: 10, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.5 } },
    exit: {
      y: -10,
      opacity: 0,
      transition: { duration: 0.5 },
    },
  },
  style: { position: 'absolute' },
};

const EarnedTagContainer = styled.div`
  position: relative;
  top: -14px;
`;

const DisplayRewards = () => {
  const {
    availableRewardsForEpochEth: reward,
    isEligibleForRewards,
    isStakingRewardsDetailsLoading,
  } = useRewardContext();
  const { selectedStakingProgramId } = useStakingProgram();

  const isLoading = isStakingRewardsDetailsLoading || !selectedStakingProgramId;

  const formattedReward = useMemo(() => {
    if (isLoading) return <TodayRewardsLoader />;
    if (reward === undefined) return NA;
    return `~${balanceFormat(reward, 2)}`;
  }, [isLoading, reward]);

  const earnedTag = useMemo(() => {
    if (isLoading) return <TagLoader />;
    return (
      <AnimatePresence>
        {isEligibleForRewards ? (
          <motion.div key="earned" {...commonMotionProps}>
            <Tag color="success">Earned</Tag>
          </motion.div>
        ) : (
          <motion.div key="not-earned" {...commonMotionProps}>
            <Tag color="processing">Not yet earned</Tag>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }, [isEligibleForRewards, isLoading]);

  return (
    <CardSection vertical gap={8} padding="16px 24px" align="start">
      <StakingRewardsThisEpoch />
      <Flex align="center" gap={12}>
        <Text className="text-xl font-weight-600">
          {formattedReward} OLAS&nbsp;
        </Text>
        <EarnedTagContainer>{earnedTag}</EarnedTagContainer>
      </Flex>
    </CardSection>
  );
};

/**
 * Rewards (Earned OLAS and Tag) including the rewards modal.
 */
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
