import { useEffect } from 'react';

import { PearlDeposit } from '@/components/PearlDeposit';
import { TokenSymbolMap } from '@/config/tokens';
import { PAGES } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { usePageState } from '@/hooks';

import { useShouldAllowStakingContractSwitch } from './hooks/useShouldAllowStakingContractSwitch';

export const DepositOlasForStaking = () => {
  const { goto } = usePageState();
  const { olasRequiredToMigrate } = useShouldAllowStakingContractSwitch();
  const { isLoading, availableAssets, updateAmountsToDeposit } =
    usePearlWallet();
  const olasBalance =
    availableAssets.find(({ symbol }) => symbol === TokenSymbolMap.OLAS)
      ?.amount ?? 0;

  // The deposit fields are target balances, so ask for the current balance
  // plus what the switch still needs. Waiting for balances also makes this
  // run after Deposit's refill pre-fill, which would otherwise replace it.
  useEffect(() => {
    if (isLoading) return;
    updateAmountsToDeposit({
      OLAS: {
        amount:
          olasRequiredToMigrate > 0 ? olasBalance + olasRequiredToMigrate : 0,
      },
    });
  }, [isLoading, olasBalance, olasRequiredToMigrate, updateAmountsToDeposit]);

  return <PearlDeposit onBack={() => goto(PAGES.ConfirmSwitch)} />;
};
