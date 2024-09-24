import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Flex } from 'antd';
import { useEffect } from 'react';

import { Pages } from '@/enums/PageState';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { MainHeader } from './header';
import { AddFundsSection } from './sections/AddFundsSection';
import { GasBalanceSection } from './sections/GasBalanceSection';
import { KeepAgentRunningSection } from './sections/KeepAgentRunningSection';
import { MainNeedsFunds } from './sections/NeedsFundsSection';
import { NewStakingProgramAlertSection } from './sections/NewStakingProgramAlertSection';
import { MainOlasBalance } from './sections/OlasBalanceSection';
import { MainRewards } from './sections/RewardsSection';
import { StakingContractUpdate } from './sections/StakingContractUpdate';

export const Main = () => {
  const { goto } = usePageState();
  const { updateServicesState } = useServices();
  const { updateBalances, isLoaded, setIsLoaded } = useBalance();
  const { activeStakingProgramId: currentStakingProgram } = useStakingProgram();

  useEffect(() => {
    if (!isLoaded) {
      setIsLoaded(true);
      updateServicesState().then(() => updateBalances());
    }
  }, [isLoaded, setIsLoaded, updateBalances, updateServicesState]);

  return (
    <Card
      title={<MainHeader />}
      extra={
        <Flex gap={8}>
          <Button
            type="default"
            size="large"
            icon={<QuestionCircleOutlined />}
            onClick={() => goto(Pages.HelpAndSupport)}
          />
          <Button
            type="default"
            size="large"
            icon={<SettingOutlined />}
            onClick={() => goto(Pages.Settings)}
          />
        </Flex>
      }
      style={{ borderTopColor: 'transparent' }}
    >
      <Flex vertical>
        {currentStakingProgram === StakingProgramId.Alpha && (
          <NewStakingProgramAlertSection />
        )}
        <MainOlasBalance />
        <MainRewards />
        <KeepAgentRunningSection />
        <StakingContractUpdate />
        <GasBalanceSection />
        <MainNeedsFunds />
        <AddFundsSection />
      </Flex>
    </Card>
  );
};
