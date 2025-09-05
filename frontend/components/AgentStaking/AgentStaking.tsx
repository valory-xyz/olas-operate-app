import { HistoryOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import { useState } from 'react';

import { CardFlex } from '@/components/styled/CardFlex';
import { BackButton } from '@/components/ui/BackButton';
import { COLOR } from '@/constants/colors';
import { Pages } from '@/enums/Pages';
import { useServiceBalances } from '@/hooks/useBalanceContext';
import { usePageState } from '@/hooks/usePageState';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useServices } from '@/hooks/useServices';
import { useStakingDetails } from '@/hooks/useStakingDetails';
import { balanceFormat } from '@/utils/numberFormatters';

import { ContractSvg } from '../custom-icons/Contract';
import { FireNoStreak } from '../custom-icons/FireNoStreak';
import { FireV1 } from '../custom-icons/FireV1';
import { Segmented } from '../ui/Segmented';
import { StakingContractDetails } from './StakingContractDetails';

const { Title, Text } = Typography;

const StakingStats = () => {
  const { optimisticStreak } = useStakingDetails();
  const { selectedService } = useServices();
  const { accruedServiceStakingRewards: unclaimedRewards = 0 } =
    useRewardContext();
  const { serviceSafeOlas } = useServiceBalances(
    selectedService?.service_config_id,
  );
  // TO Check: this might still not have olas that have been removed from the wallet
  const claimedRewards = serviceSafeOlas?.balance ?? 0;
  const totalRewards = claimedRewards + unclaimedRewards;

  return (
    <CardFlex $noBorder $newStyles>
      <Flex gap={56}>
        <Flex vertical gap={8} flex={1}>
          <Text type="secondary">Total rewards earned</Text>
          <Title level={5} className="mt-0 mb-0">
            {balanceFormat(totalRewards ?? 0, 2)} OLAS
          </Title>
        </Flex>

        <Flex vertical gap={8} flex={1}>
          <Text type="secondary">Current streak</Text>

          <Flex>
            {optimisticStreak > 0 ? (
              <FireV1 fill={COLOR.PURPLE} />
            ) : (
              <FireNoStreak />
            )}
            <Title level={5} className="mt-0 mb-0 ml-8">
              {optimisticStreak}
            </Title>
          </Flex>
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

const SelectionTabs = ({ currentTab, setCurrentTab }: SelectionTabsProps) => {
  return (
    <Flex className="mt-32 mb-32">
      <Segmented
        value={currentTab}
        onChange={(value) =>
          setCurrentTab(value as 'StakingContract' | 'RewardsHistory')
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
};

export const AgentStaking = () => {
  const { goto } = usePageState();
  const [currentTab, setCurrentTab] =
    useState<SelectionTabsProps['currentTab']>('StakingContract');

  return (
    <div>
      <BackButton onPrev={() => goto(Pages.Main)} />
      <Title level={3} className="mt-12 mb-32">
        Agent Staking
      </Title>
      <StakingStats />

      <SelectionTabs currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {currentTab === 'StakingContract' && <StakingContractDetails />}
      {/* {currentTab === 'RewardsHistory' && <RewardsHistory />} */}
    </div>
  );
};
