import { UnderConstruction } from '@/components/Alerts';
import { CardSection } from '@/components/ui';
import { useFeatureFlag } from '@/hooks';

import { AddBackupWalletAlert } from './AddBackupWalletAlert';
import { AvoidSuspensionAlert } from './AvoidSuspensionAlert';
import { ContractDeprecatedAlert } from './ContractDeprecatedAlert';
import { LowFunds } from './LowFunds/LowFunds';
import { NoAvailableSlotsOnTheContract } from './NoAvailableSlotsOnTheContract';
import { UpdateAgentConfiguration } from './UpdateAgentConfiguration';
import { UpdateAvailableAlert } from './UpdateAvailableAlert';
import { WhatsNewAlert } from './WhatsNewAlert';

export const AlertSections = () => {
  const isBackupViaSafeEnabled = useFeatureFlag('backup-via-safe');
  return (
    <CardSection vertical>
      <WhatsNewAlert />
      <UpdateAvailableAlert />
      {isBackupViaSafeEnabled && <AddBackupWalletAlert />}
      <UnderConstruction showMoreInfo />
      <ContractDeprecatedAlert />
      <AvoidSuspensionAlert />
      <UpdateAgentConfiguration />
      <LowFunds />
      <NoAvailableSlotsOnTheContract />
    </CardSection>
  );
};
