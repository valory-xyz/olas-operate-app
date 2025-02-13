import { CardSection } from '@/components/styled/CardSection';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

import { AddBackupWalletAlert } from './AddBackupWalletAlert';
import { AvoidSuspensionAlert } from './AvoidSuspensionAlert';
import { LowFunds } from './LowFunds/LowFunds';
import { NoAvailableSlotsOnTheContract } from './NoAvailableSlotsOnTheContract';
import { UpdateAvailableAlert } from './UpdateAvailableAlert';
import { YourAgentCannotSignIn } from './YourAgentCannotSignIn';

export const AlertSections = () => {
  const isBackupViaSafeEnabled = useFeatureFlag('backup-via-safe');
  return (
    <CardSection vertical>
      <UpdateAvailableAlert />
      {isBackupViaSafeEnabled && <AddBackupWalletAlert />}
      <AvoidSuspensionAlert />
      <YourAgentCannotSignIn />
      <LowFunds />
      <NoAvailableSlotsOnTheContract />
    </CardSection>
  );
};
