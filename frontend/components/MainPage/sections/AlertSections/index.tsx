import { CardSection } from '@/components/styled/CardSection';

import { AddBackupWalletAlert } from './AddBackupWalletAlert';
import { AvoidSuspensionAlert } from './AvoidSuspensionAlert';
import { LowTradingBalanceAlert } from './LowTradingBalanceAlert';
import { NewStakingProgramAlert } from './NewStakingProgramAlert';
import { UpdateAvailableAlert } from './UpdateAvailableAlert';

export const AlertSections = () => {
  return (
    <CardSection vertical>
      <UpdateAvailableAlert />
      <AddBackupWalletAlert />
      <NewStakingProgramAlert />
      <AvoidSuspensionAlert />
      <LowTradingBalanceAlert />
    </CardSection>
  );
};
