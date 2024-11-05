import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Flex } from 'antd';
import { useEffect } from 'react';

import { Pages } from '@/enums/PageState';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
import { useMasterSafe } from '@/hooks/useMasterSafe';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useStakingContractInfo } from '@/hooks/useStakingContractInfo';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { MainHeader } from './header';
import { AddFundsSection } from './sections/AddFundsSection';
import { AlertSections } from './sections/AlertSections';
import { GasBalanceSection } from './sections/GasBalanceSection';
import { KeepAgentRunningSection } from './sections/KeepAgentRunningSection';
import { MainNeedsFunds } from './sections/NeedsFundsSection';
import { MainOlasBalance } from './sections/OlasBalanceSection';
import { RewardsSection } from './sections/RewardsSection';
import { StakingContractUpdate } from './sections/StakingContractUpdate';

export const Main = () => {
  const { goto } = usePageState();
  const { backupSafeAddress } = useMasterSafe();
  const { updateServicesState } = useServices();
  const { updateBalances, isLoaded, setIsLoaded } = useBalance();
  const { activeStakingProgramId: currentStakingProgram } = useStakingProgram();
  const { hasEnoughServiceSlots } = useStakingContractInfo();

  useEffect(() => {
    if (!isLoaded) {
      setIsLoaded(true);
      updateServicesState().then(() => updateBalances());
    }
  }, [isLoaded, setIsLoaded, updateBalances, updateServicesState]);

  const hideMainOlasBalanceTopBorder = [
    !backupSafeAddress,
    currentStakingProgram === StakingProgramId.Alpha,
    !hasEnoughServiceSlots,
  ].some((condition) => !!condition);

  return (
    <Card
      title={<MainHeader />}
      styles={{
        body: {
          paddingTop: 0,
          paddingBottom: 0,
        },
      }}
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
        <AlertSections />
        <MainOlasBalance isBorderTopVisible={!hideMainOlasBalanceTopBorder} />
        <RewardsSection />
        <KeepAgentRunningSection />
        {currentStakingProgram && (
          <StakingContractUpdate stakingProgramId={currentStakingProgram} />
        )}
        <GasBalanceSection />
        <MainNeedsFunds />
        <AddFundsSection />
      </Flex>
    </Card>
  );
};
