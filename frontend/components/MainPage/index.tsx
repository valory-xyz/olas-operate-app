import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Flex } from 'antd';
import { useEffect } from 'react';

import { Pages } from '@/enums/PageState';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
import { useMasterSafe } from '@/hooks/useMasterSafe';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import {
  useStakingContractContext,
  useStakingContractInfo,
} from '@/hooks/useStakingContractInfo';
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
  const {
    updateBalances,
    isLoaded: isBalanceLoaded,
    setIsLoaded: setIsBalanceLoaded,
  } = useBalance();
  const { activeStakingProgramId, defaultStakingProgramId } =
    useStakingProgram();

  const { isStakingContractInfoRecordLoaded } = useStakingContractContext();

  const { hasEnoughServiceSlots } = useStakingContractInfo(
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

  /**
   * @todo rename, unclear why this is needed
   * assuming only relevant when alerts not visible
   */
  const hideMainOlasBalanceTopBorder = [
    !backupSafeAddress,
    activeStakingProgramId === StakingProgramId.Alpha,
    isStakingContractInfoRecordLoaded && !hasEnoughServiceSlots,
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
        <StakingContractUpdate />
        <GasBalanceSection />
        <MainNeedsFunds />
        <AddFundsSection />
      </Flex>
    </Card>
  );
};
