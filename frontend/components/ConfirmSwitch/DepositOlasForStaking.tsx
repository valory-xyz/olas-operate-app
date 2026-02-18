import { useEffect } from 'react';

import { PearlDeposit } from '@/components/PearlDeposit';
import { PAGES } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { usePageState } from '@/hooks';

import { useShouldAllowStakingContractSwitch } from './hooks/useShouldAllowStakingContractSwitch';

export const DepositOlasForStaking = () => {
  const { goto } = usePageState();
  const { olasRequiredToMigrate } = useShouldAllowStakingContractSwitch();
  const { updateAmountsToDeposit } = usePearlWallet();

  useEffect(() => {
    updateAmountsToDeposit({ OLAS: { amount: olasRequiredToMigrate } });
  }, [olasRequiredToMigrate, updateAmountsToDeposit]);

  return <PearlDeposit onBack={() => goto(PAGES.ConfirmSwitch)} />;
};
