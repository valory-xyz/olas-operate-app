import { HistoryOutlined } from '@ant-design/icons';
import { Flex, Skeleton, Typography } from 'antd';
import { useState } from 'react';

import { ContractSvg } from '@/components/custom-icons/Contract';
import { FireNoStreak } from '@/components/custom-icons/FireNoStreak';
import { FireV1 } from '@/components/custom-icons/FireV1';
import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';
import { Segmented } from '@/components/ui/Segmented';
import { EvmChainName } from '@/constants/chains';
import { COLOR } from '@/constants/colors';
import { TokenSymbolMap } from '@/constants/token';
import { MAIN_CONTENT_MAX_WIDTH } from '@/constants/width';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useRewardsHistory } from '@/hooks/useRewardsHistory';
import { useServices } from '@/hooks/useServices';
import { useStakingDetails } from '@/hooks/useStakingDetails';
import { useUsdAmounts } from '@/hooks/useUsdAmounts';

import { RewardsHistory } from './RewardsHistory';
import { StakingContractDetails } from './StakingContractDetails';

const { Title, Text } = Typography;

const StatsSkeleton = () => <Skeleton.Input active size="small" />;

const useUsdRewards = () => {
  const { selectedAgentConfig } = useServices();
  const { evmHomeChainId } = selectedAgentConfig;
  const chainName = EvmChainName[evmHomeChainId];
  const { totalRewards } = useRewardsHistory();

  const { totalUsd } = useUsdAmounts(chainName, [
    {
      symbol: TokenSymbolMap.OLAS,
      amount: totalRewards,
    },
  ]);

  return totalUsd;
};

const StakingStats = () => {
  const { optimisticStreak, isStreakLoading } = useStakingDetails();
  const { isLoading: isRewardsHistoryLoading } = useRewardsHistory();
  const totalRewardsInUsd = useUsdRewards();

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
              ${totalRewardsInUsd.toFixed(2)}
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

type SelectionTabValue = 'StakingContract' | 'RewardsHistory';

type SelectionTabsProps = {
  currentTab: SelectionTabValue;
  setCurrentTab: (value: SelectionTabValue) => void;
};

type SelectionTabProps = {
  label: string;
  value: string;
  isSelected: boolean;
};

const SelectionTab = ({ label, value, isSelected }: SelectionTabProps) => {
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
    <Segmented<SelectionTabValue>
      value={currentTab}
      onChange={(value) => setCurrentTab(value)}
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
