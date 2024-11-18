import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Flex } from 'antd';
import { useEffect } from 'react';

import { Pages } from '@/enums/Pages';
// import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
// import { useMasterSafe } from '@/hooks/useMasterSafe';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import {
  useStakingContractContext,
  useStakingContractDetails,
} from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';

// import { useStakingProgram } from '@/hooks/useStakingProgram';
import { MainHeader } from './header';
import { AddFundsSection } from './sections/AddFundsSection';
// import { MainNeedsFunds } from './sections/NeedsFundsSection';
import { MainOlasBalance } from './sections/OlasBalanceSection';
// import { AlertSections } from './sections/AlertSections';
// import { GasBalanceSection } from './sections/GasBalanceSection';
// import { KeepAgentRunningSection } from './sections/KeepAgentRunningSection';
import { RewardsSection } from './sections/RewardsSection';
// import { StakingContractUpdate } from './sections/StakingContractUpdate';

export const Main = () => {
  const { goto } = usePageState();
  // const { backupSafeAddress } = useMasterSafe();
  const { updateServicesState } = useServices();
  const {
    updateBalances,
    isLoaded: isBalanceLoaded,
    setIsLoaded: setIsBalanceLoaded,
  } = useBalance();
  const { activeStakingProgramId, defaultStakingProgramId } =
    useStakingProgram();

  const { isAllStakingContractDetailsRecordLoaded } =
    useStakingContractContext();

  const { hasEnoughServiceSlots } = useStakingContractDetails(
    activeStakingProgramId ?? defaultStakingProgramId,
  );

  /**
   * @todo fix this isLoaded logic
   */
  useEffect(() => {
    if (!isBalanceLoaded) {
      updateServicesState().then(() => updateBalances());
      setIsBalanceLoaded(true);
    }
  }, [
    isBalanceLoaded,
    setIsBalanceLoaded,
    updateBalances,
    updateServicesState,
  ]);

  const hideMainOlasBalanceTopBorder = [
    !backupSafeAddress,
    activeStakingProgramId === StakingProgramId.Alpha,
    isAllStakingContractDetailsRecordLoaded && !hasEnoughServiceSlots,
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
        {/* <AlertSections /> */}
        <MainOlasBalance isBorderTopVisible={false} />
        {/* <MainOlasBalance isBorderTopVisible={!hideMainOlasBalanceTopBorder} /> */}
        <RewardsSection />
        {/* <KeepAgentRunningSection /> */}
        {/* <StakingContractUpdate /> */}
        {/* <GasBalanceSection /> */}
        {/* <MainNeedsFunds /> */}
        <AddFundsSection />
      </Flex>
    </Card>
  );
};
