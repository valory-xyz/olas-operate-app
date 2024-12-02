import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Flex } from 'antd';

import { Pages } from '@/enums/Pages';
import { StakingProgramId } from '@/enums/StakingProgram';
// import { StakingProgramId } from '@/enums/StakingProgram';
// import { useMasterSafe } from '@/hooks/useMasterSafe';
import { usePageState } from '@/hooks/usePageState';
import {
  useStakingContractContext,
  useStakingContractDetails,
} from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CardSection } from '../styled/CardSection';
// import { useMasterWalletContext } from '@/hooks/useWallet';
import { MainHeader } from './header';
import { AddFundsSection } from './sections/AddFundsSection';
import { AlertSections } from './sections/AlertSections';
import { GasBalanceSection } from './sections/GasBalanceSection';
import { KeepAgentRunningSection } from './sections/KeepAgentRunningSection';
import { MainNeedsFunds } from './sections/NeedsFundsSection';
import { MainOlasBalance } from './sections/OlasBalanceSection';
import { RewardsSection } from './sections/RewardsSection';
import { StakingContractSection } from './sections/StakingContractUpdate';

export const Main = () => {
  const { goto } = usePageState();
  // const { backupSafeAddress } = useMasterWalletContext();
  // const { refetch: updateServicesState } = useServices();
  // const {
  //   updateBalances,
  //   isLoaded: isBalanceLoaded,
  //   setIsLoaded: setIsBalanceLoaded,
  // } = useBalanceContext();
  const { activeStakingProgramId } = useStakingProgram();

  // TODO: reintroduce later,  non critical
  const { isAllStakingContractDetailsRecordLoaded } =
    useStakingContractContext();

  const { hasEnoughServiceSlots } = useStakingContractDetails(
    activeStakingProgramId,
  );

  // TODO: reintroduce later,  non critical

  // useEffect(() => {
  //   if (!isBalanceLoaded) {
  //     updateServicesState?.().then(() => updateBalances());
  //     setIsBalanceLoaded(true);
  //   }
  // }, [
  //   isBalanceLoaded,
  //   setIsBalanceLoaded,
  //   updateBalances,
  //   updateServicesState,
  // ]);

  // TODO: reintroduce later,  non critical

  const hideMainOlasBalanceTopBorder = [
    // !backupSafeAddress, // TODO: update this condition to check backup safe relative to selectedService
    activeStakingProgramId === StakingProgramId.PearlAlpha,
    isAllStakingContractDetailsRecordLoaded && !hasEnoughServiceSlots,
  ].some((condition) => !!condition);

  return (
    <Card
      styles={{
        body: {
          paddingTop: 0,
          paddingBottom: 0,
        },
      }}
      style={{ borderTopColor: 'transparent' }}
    >
      <Flex vertical>
        <CardSection
          gap={8}
          // borderbottom="true"
          padding="8px 24px"
          justify="space-between"
        >
          <MainHeader />
          <Flex gap={8} align="center">
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
        </CardSection>
        <AlertSections />
        <MainOlasBalance isBorderTopVisible={!hideMainOlasBalanceTopBorder} />
        <RewardsSection />
        <KeepAgentRunningSection />
        <StakingContractSection />
        <GasBalanceSection />
        <MainNeedsFunds />
        <AddFundsSection />
      </Flex>
    </Card>
  );
};
