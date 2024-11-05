import { CardSection } from '@/components/styled/CardSection';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { AddBackupWalletAlert } from './AddBackupWalletAlert';
import { AvoidSuspensionAlert } from './AvoidSuspensionAlert';
import { LowTradingBalanceAlert } from './LowTradingBalanceAlert';
import { NewStakingProgramAlert } from './NewStakingProgramAlert';
import { NoAvailableSlotsOnTheContract } from './NoAvailableSlotsOnTheContract';
import { UpdateAvailableAlert } from './UpdateAvailableAlert';

export const AlertSections = () => {
  const { activeStakingProgramId } = useStakingProgram();

  return (
    <CardSection vertical>
      <UpdateAvailableAlert />
      <AddBackupWalletAlert />
      <NewStakingProgramAlert />
      <AvoidSuspensionAlert />
      <LowTradingBalanceAlert />
      {activeStakingProgramId && (
        <NoAvailableSlotsOnTheContract
          stakingProgramId={activeStakingProgramId}
        />
      )}
    </CardSection>
  );
};
