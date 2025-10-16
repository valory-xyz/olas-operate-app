import { Pages } from '@/enums';
import { usePageState } from '@/hooks';

import { Deposit } from '../PearlDeposit/Deposit';
import { useShouldAllowSwitch } from './hooks/useShouldAllowSwitch';

export const DepositOlasForStaking = () => {
  const { goto } = usePageState();
  const { olasRequiredToMigrate } = useShouldAllowSwitch();

  return (
    <Deposit
      onBack={() => goto(Pages.ConfirmSwitch)}
      overrideAmountsToDeposit={{ OLAS: olasRequiredToMigrate }}
    />
  );
};
