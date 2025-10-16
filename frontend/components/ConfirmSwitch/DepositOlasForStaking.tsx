import { useEffect } from 'react';

import { PearlDeposit } from '@/components/PearlDeposit';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { Pages } from '@/enums';
import { usePageState } from '@/hooks';

import { useShouldAllowStakingContractSwitch } from './hooks/useShouldAllowStakingContractSwitch';

export const DepositOlasForStaking = () => {
  const { goto } = usePageState();
  const { olasRequiredToMigrate } = useShouldAllowStakingContractSwitch();
  const { updateAmountsToDeposit } = usePearlWallet();

  useEffect(() => {
    updateAmountsToDeposit({ OLAS: olasRequiredToMigrate });
  }, [olasRequiredToMigrate, updateAmountsToDeposit]);

  return <PearlDeposit onBack={() => goto(Pages.ConfirmSwitch)} />;
};
