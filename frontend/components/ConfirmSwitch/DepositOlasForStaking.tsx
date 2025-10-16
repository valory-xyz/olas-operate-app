import { PearlDeposit } from '@/components/PearlDeposit';
import { Pages } from '@/enums';
import { usePageState } from '@/hooks';

import { useShouldAllowSwitch } from './hooks/useShouldAllowSwitch';

export const DepositOlasForStaking = () => {
  const { goto } = usePageState();
  const { olasRequiredToMigrate } = useShouldAllowSwitch();

  return (
    <PearlDeposit
      onBack={() => goto(Pages.ConfirmSwitch)}
      overrideAmountsToDeposit={{ OLAS: olasRequiredToMigrate }}
    />
  );
};
