import { Flex, Segmented, Typography } from 'antd';
import { useState } from 'react';

import { CardFlex } from '@/components/styled/CardFlex';
import { BackButton } from '@/components/ui/BackButton';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { StakingContractDetails } from './StakingContractDetails';

const { Title, Text } = Typography;

const StakingStats = () => {
  return (
    <CardFlex $noBorder>
      <Flex gap={56}>
        <Flex vertical flex={1}>
          <Text type="secondary">Total rewards earned</Text>
        </Flex>

        <Flex vertical flex={1}>
          <Text type="secondary">Current streak</Text>
        </Flex>
      </Flex>
    </CardFlex>
  );
};

type SelectionTabsProps = {
  currentTab: 'StakingContract' | 'RewardsHistory';
  setCurrentTab: (value: 'StakingContract' | 'RewardsHistory') => void;
};

const SelectionTabs = ({ currentTab, setCurrentTab }: SelectionTabsProps) => {
  return (
    <Flex className="mt-32 mb-32">
      <Segmented
        value={currentTab}
        style={{ marginBottom: 8 }}
        onChange={setCurrentTab}
        options={[
          { label: 'Staking Contract', value: 'StakingContract' },
          { label: 'Rewards History', value: 'RewardsHistory' },
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
