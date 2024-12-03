import { Card, Flex } from 'antd';

import { StakingProgramId } from '@/enums/StakingProgram';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
// import { StakingProgramId } from '@/enums/StakingProgram';
// import { useMasterSafe } from '@/hooks/useMasterSafe';
import {
  useStakingContractContext,
  useStakingContractDetails,
} from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';

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
import { SwitchAgentSection } from './sections/SwitchAgentSection';

export const Main = () => {
  const isStakingContractSectionEnabled = useFeatureFlag(
    'staking-contract-section',
  );
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
      styles={{ body: { paddingTop: 0, paddingBottom: 0 } }}
      style={{ borderTopColor: 'transparent' }}
    >
      <Flex vertical>
        <SwitchAgentSection />
        <MainHeader />
        <AlertSections />
        <MainOlasBalance isBorderTopVisible={!hideMainOlasBalanceTopBorder} />
        <RewardsSection />
        <KeepAgentRunningSection />
        {isStakingContractSectionEnabled && <StakingContractSection />}
        <GasBalanceSection />
        <MainNeedsFunds />
        <AddFundsSection />
      </Flex>
    </Card>
  );
};
