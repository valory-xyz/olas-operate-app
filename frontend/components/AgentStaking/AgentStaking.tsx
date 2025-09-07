import { HistoryOutlined } from '@ant-design/icons';
import { Flex, Skeleton, Typography } from 'antd';
import { useState } from 'react';

import { ContractSvg } from '@/components/custom-icons/Contract';
import { FireNoStreak } from '@/components/custom-icons/FireNoStreak';
import { FireV1 } from '@/components/custom-icons/FireV1';
import { CardFlex } from '@/components/styled/CardFlex';
import { BackButton } from '@/components/ui/BackButton';
import { Segmented } from '@/components/ui/Segmented';
import { COLOR } from '@/constants/colors';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useRewardsHistory } from '@/hooks/useRewardsHistory';
import { useStakingDetails } from '@/hooks/useStakingDetails';
import { balanceFormat } from '@/utils/numberFormatters';

import { StakingContractDetails } from './StakingContractDetails';

const { Title, Text } = Typography;

const StatsSkeleton = () => <Skeleton.Input active size="small" />;

const StakingStats = () => {
  const { optimisticStreak, isStreakLoading } = useStakingDetails();
  const { totalRewards, isLoading: isRewardsHistoryLoading } =
    useRewardsHistory();

  const fireIcon =
    optimisticStreak > 0 ? <FireV1 fill={COLOR.PURPLE} /> : <FireNoStreak />;

  return (
    <CardFlex $noBorder $newStyles>
      <Flex gap={56}>
        <Flex vertical gap={8} flex={1}>
          <Text type="secondary">Total rewards earned</Text>
          {isRewardsHistoryLoading ? (
            <StatsSkeleton />
          ) : (
            <Title level={5} className="mt-0 mb-0">
              {balanceFormat(totalRewards ?? 0, 2) + ' OLAS'}
            </Title>
          )}
        </Flex>

        <Flex vertical gap={8} flex={1}>
          <Text type="secondary">Current streak</Text>

          {isStreakLoading ? (
            <StatsSkeleton />
          ) : (
            <Flex>
              {fireIcon}
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

type SelectionTabsProps = {
  currentTab: 'StakingContract' | 'RewardsHistory';
  setCurrentTab: (value: 'StakingContract' | 'RewardsHistory') => void;
};

const SelectionTab = ({
  label,
  value,
  isSelected,
}: {
  label: string;
  value: string;
  isSelected: boolean;
}) => {
  const textColor = isSelected
    ? COLOR.TEXT_NEUTRAL_PRIMARY
    : COLOR.TEXT_NEUTRAL_TERTIARY;
  const textClass = isSelected
    ? 'text-neutral-primary'
    : 'text-neutral-tertiary';
  return (
    <Flex align="center" gap={8}>
      {value === 'StakingContract' ? (
        <ContractSvg fill={textColor} stroke={textColor} />
      ) : (
        <HistoryOutlined color={textColor} />
      )}
      <Text className={textClass}>{label}</Text>
    </Flex>
  );
};

const SelectionTabs = ({ currentTab, setCurrentTab }: SelectionTabsProps) => (
  <Flex className="mt-32 mb-32">
    <Segmented
      value={currentTab}
      onChange={(value) =>
        setCurrentTab(value as SelectionTabsProps['currentTab'])
      }
      options={[
        {
          label: (
            <SelectionTab
              label="Staking Contract"
              value="StakingContract"
              isSelected={currentTab === 'StakingContract'}
            />
          ),
          value: 'StakingContract',
        },
        {
          label: (
            <SelectionTab
              label="Rewards History"
              value="RewardsHistory"
              isSelected={currentTab === 'RewardsHistory'}
            />
          ),
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
    <Flex vertical>
      <BackButton onPrev={() => goto(Pages.Main)} />
      <Title level={3} className="mt-12 mb-32">
        Agent Staking
      </Title>
      <StakingStats />

      <SelectionTabs currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {currentTab === 'StakingContract' && <StakingContractDetails />}
      {/* {currentTab === 'RewardsHistory' && <RewardsHistory />} */}
    </Flex>
  );
};
