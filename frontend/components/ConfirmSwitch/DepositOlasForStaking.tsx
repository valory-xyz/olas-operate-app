import { useEffect } from 'react';

import { PearlDeposit } from '@/components/PearlDeposit';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { Pages } from '@/enums';
import { usePageState } from '@/hooks';

import { useShouldAllowSwitch } from './hooks/useShouldAllowSwitch';

export const DepositOlasForStaking = () => {
  const { goto } = usePageState();
  const { olasRequiredToMigrate } = useShouldAllowSwitch();
  const { manuallySetAmountsToDeposit } = usePearlWallet();

  useEffect(() => {
    manuallySetAmountsToDeposit({ OLAS: olasRequiredToMigrate });
  }, [olasRequiredToMigrate, manuallySetAmountsToDeposit]);

  return <PearlDeposit onBack={() => goto(Pages.ConfirmSwitch)} />;
};
