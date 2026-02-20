import { Flex, Skeleton, Typography } from 'antd';
import Image from 'next/image';
import { useState } from 'react';
import { TbFileText, TbHistory } from 'react-icons/tb';

import { FireV1 } from '@/components/custom-icons';
import { BackButton, CardFlex, InfoTooltip, Segmented } from '@/components/ui';
import { MAIN_CONTENT_MAX_WIDTH, PAGES } from '@/constants';
import {
  usePageState,
  useRewardContext,
  useRewardsHistory,
  useStakingDetails,
} from '@/hooks';

import { RewardsHistory } from './RewardsHistory';
import { StakingContractDetails } from './StakingContractDetails';

const { Title, Text } = Typography;

const StatsSkeleton = () => <Skeleton.Input active size="small" />;

const StakingStats = () => {
  const { optimisticStreak, isStreakLoading } = useStakingDetails();
  const { isEligibleForRewards } = useRewardContext();
  const { isLoading: isTotalRewardsLoading, totalRewards } =
    useRewardsHistory();

  const isFlameActive = optimisticStreak > 0 && isEligibleForRewards;

  return (
    <CardFlex $noBorder $newStyles>
      <Flex gap={56}>
        <Flex vertical gap={8} flex={1}>
          <Flex align="center" gap={8}>
            <Text type="secondary">Total rewards earned </Text>
            <InfoTooltip>
              Total staking rewards your agent has earned since setup.
            </InfoTooltip>
          </Flex>
          {isTotalRewardsLoading ? (
            <StatsSkeleton />
          ) : (
            <Title level={5} className="mt-0 mb-0">
              <Flex align="center" gap={8}>
                <Image
                  src={`/tokens/olas-icon.png`}
                  alt="OLAS"
                  width={20}
                  height={20}
                />
                {totalRewards.toFixed(2)}
              </Flex>
            </Title>
          )}
        </Flex>

        <Flex vertical gap={8} flex={1}>
          <Flex align="center" gap={8}>
            <Text type="secondary">Current streak</Text>
            <InfoTooltip>
              Streak shows how many consecutive epochs your agent has earned
              rewards.
            </InfoTooltip>
          </Flex>

          {isStreakLoading ? (
            <StatsSkeleton />
          ) : (
            <Title level={5} className="mt-0 mb-0">
              <Flex align="center" gap={8}>
                <FireV1 isActive={isFlameActive} />
                {optimisticStreak}
              </Flex>
            </Title>
          )}
        </Flex>
      </Flex>
    </CardFlex>
  );
};

type SelectionTabValue = 'StakingContract' | 'RewardsHistory';

type SelectionTabsProps = {
  currentTab: SelectionTabValue;
  setCurrentTab: (value: SelectionTabValue) => void;
};

const SelectionTabs = ({ currentTab, setCurrentTab }: SelectionTabsProps) => (
  <Flex className="mt-32 mb-32">
    <Segmented<SelectionTabValue>
      value={currentTab}
      onChange={(value) => setCurrentTab(value)}
      options={[
        {
          label: 'Staking Contract',
          icon: <TbFileText size={18} />,
          value: 'StakingContract',
        },
        {
          icon: <TbHistory size={18} />,
          label: 'Rewards History',
          value: 'RewardsHistory',
        },
      ]}
    />
  </Flex>
);

export const AgentStaking = () => {
  const { goto } = usePageState();
  const [currentTab, setCurrentTab] =
    useState<SelectionTabsProps['currentTab']>('StakingContract');

  return (
    <Flex vertical style={{ width: MAIN_CONTENT_MAX_WIDTH, margin: '0 auto' }}>
      <BackButton onPrev={() => goto(PAGES.Main)} />
      <Title level={3} className="mt-12 mb-32">
        Agent Staking
      </Title>
      <StakingStats />

      <SelectionTabs currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {currentTab === 'StakingContract' && <StakingContractDetails />}
      {currentTab === 'RewardsHistory' && <RewardsHistory />}
    </Flex>
  );
};
