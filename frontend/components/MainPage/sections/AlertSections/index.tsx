import { CardSection } from '@/components/styled/CardSection';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

import { AddBackupWalletAlert } from './AddBackupWalletAlert';
import { AvoidSuspensionAlert } from './AvoidSuspensionAlert';
import { ContractDeprecatedAlert } from './ContractDeprecatedAlert';
import { LowFunds } from './LowFunds/LowFunds';
import { NoAvailableSlotsOnTheContract } from './NoAvailableSlotsOnTheContract';
import { UpdateAgentConfiguration } from './UpdateAgentConfiguration';
import { UpdateAvailableAlert } from './UpdateAvailableAlert';

export const AlertSections = () => {
  const isBackupViaSafeEnabled = useFeatureFlag('backup-via-safe');
  return (
    <CardSection vertical>
      <UpdateAvailableAlert />
      {isBackupViaSafeEnabled && <AddBackupWalletAlert />}
      <ContractDeprecatedAlert />
      <AvoidSuspensionAlert />
      <UpdateAgentConfiguration />
      <LowFunds />
      <NoAvailableSlotsOnTheContract />
    </CardSection>
  );
};
