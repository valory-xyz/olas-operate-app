import { Flex, Image, Skeleton, Typography } from 'antd';
import { useState } from 'react';
import { TbFileText, TbHistory } from 'react-icons/tb';

import { FireV1 } from '@/components/custom-icons';
import { BackButton, CardFlex, Segmented } from '@/components/ui';
import { MAIN_CONTENT_MAX_WIDTH } from '@/constants';
import { Pages } from '@/enums/Pages';
import {
  usePageState,
  useRewardContext,
  useServiceOnlyRewardsHistory,
  useStakingDetails,
} from '@/hooks';

import { RewardsHistory } from './RewardsHistory';
import { StakingContractDetails } from './StakingContractDetails';

const { Title, Text } = Typography;

const StatsSkeleton = () => <Skeleton.Input active size="small" />;

const StakingStats = () => {
  const { optimisticStreak, isStreakLoading } = useStakingDetails();
  const { isEligibleForRewards } = useRewardContext();
  const { isLoading: isTotalRewardsLoading } = useServiceOnlyRewardsHistory();
  const { totalRewards } = useServiceOnlyRewardsHistory();

  const isFlameActive = optimisticStreak > 0 && isEligibleForRewards;

  return (
    <CardFlex $noBorder $newStyles>
      <Flex gap={56}>
        <Flex vertical gap={8} flex={1}>
          <Text type="secondary">Total rewards earned</Text>
          {isTotalRewardsLoading ? (
            <StatsSkeleton />
          ) : (
            <Title level={5} className="mt-0 mb-0">
              <Flex align="center" gap={8}>
                <Image
                  src={`/tokens/olas-icon.png`}
                  alt="OLAS"
                  width={20}
                  className="flex"
                />
                {totalRewards.toFixed(2)}
              </Flex>
            </Title>
          )}
        </Flex>

        <Flex vertical gap={8} flex={1}>
          <Text type="secondary">Current streak</Text>

          {isStreakLoading ? (
            <StatsSkeleton />
          ) : (
            <Flex>
              <FireV1 isActive={isFlameActive} />
              <Title level={5} className="mt-0 mb-0 ml-8">
                {optimisticStreak}
              </Title>
            </Flex>
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
      <BackButton onPrev={() => goto(Pages.Main)} />
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
