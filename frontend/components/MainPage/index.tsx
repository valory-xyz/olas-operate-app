import { Card, Flex } from 'antd';

import { useFeatureFlag } from '@/hooks/useFeatureFlag';

import { MainHeader } from './header';
import { AddFundsSection } from './sections/AddFundsSection';
import { AlertSections } from './sections/AlertSections';
import { GasBalanceSection } from './sections/GasBalanceSection';
import { KeepAgentRunningSection } from './sections/KeepAgentRunningSection';
import { MainOlasBalance } from './sections/OlasBalanceSection';
import { RewardsSection } from './sections/RewardsSection';
import { StakingContractSection } from './sections/StakingContractUpdate';
import { SwitchAgentSection } from './sections/SwitchAgentSection';

export const Main = () => {
  const isStakingContractSectionEnabled = useFeatureFlag(
    'staking-contract-section',
  );

  return (
    <Card
      styles={{ body: { paddingTop: 0, paddingBottom: 0 } }}
      style={{ borderTopColor: 'transparent' }}
    >
      <Flex vertical>
        <SwitchAgentSection />
        <MainHeader />
        <AlertSections />
        <MainOlasBalance />
        <RewardsSection />
        <KeepAgentRunningSection />
        {isStakingContractSectionEnabled && <StakingContractSection />}
        <GasBalanceSection />
        <AddFundsSection />
      </Flex>
    </Card>
  );
};
