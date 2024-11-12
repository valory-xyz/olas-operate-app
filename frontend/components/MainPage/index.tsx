import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Flex } from 'antd';

import { Pages } from '@/enums/Pages';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useMasterSafe } from '@/hooks/useMasterSafe';
// import { useMasterSafe } from '@/hooks/useMasterSafe';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
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
  const { refetchServicesState } = useService();
  // const { updateBalances, isLoaded, setIsLoaded } = useBalance();
  const { activeStakingProgramId: currentStakingProgram } = useStakingProgram();

  // TODO: move to services provider as it depends on services
  // useEffect(() => {
  //   if (!isLoaded) {
  //     setIsLoaded(true);
  //     refetchServicesState().then(() => updateBalances());
  //   }
  // }, [isLoaded, setIsLoaded, updateBalances, refetchServicesState]);

  const hideMainOlasBalanceTopBorder = [
    !backupSafeAddress,
    currentStakingProgram === StakingProgramId.PearlAlpha,
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
        <MainOlasBalance isBorderTopVisible={false} />
        <MainOlasBalance isBorderTopVisible={!hideMainOlasBalanceTopBorder} />
        <RewardsSection />
        <KeepAgentRunningSection />
        <StakingContractUpdate />
        <GasBalanceSection />
        <MainNeedsFunds />
        <AddFundsSection />
      </Flex>
    </Card>
  );
};
