import { useEffect, useMemo } from 'react';

import { AddFundsToMasterSafeThroughBridge } from '@/components/AddFundsThroughBridge/AddFundsToMasterSafeThroughBridge';
import { LowOperatingBalanceBridgeFunds } from '@/components/AddFundsThroughBridge/LowOperatingBalanceBridgeFunds';
import { LowSafeSignerBalanceBridgeFunds } from '@/components/AddFundsThroughBridge/LowSafeSignerBalanceBridgeFunds';
import { Main } from '@/components/MainPageV1';
import { ManageStakingPage } from '@/components/ManageStakingPage';
import { RewardsHistory } from '@/components/RewardsHistory/RewardsHistory';
import { Setup } from '@/components/SetupPage';
import { YourWalletPage } from '@/components/YourWalletPage';
import { Pages } from '@/enums/Pages';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';

export default function Home() {
  const { pageState } = usePageState();
  const electronApi = useElectronApi();

  useEffect(() => {
    // Notify the main process that the app is loaded
    electronApi?.setIsAppLoaded?.(true);
  }, [electronApi]);

  const page = useMemo(() => {
    switch (pageState) {
      case Pages.Setup:
        return <Setup />;
      case Pages.Main:
        return <Main />;
      case Pages.ManageStaking:
        return <ManageStakingPage />;
      case Pages.ManageWallet:
        return <YourWalletPage />;
      case Pages.RewardsHistory:
        return <RewardsHistory />;

      // bridge pages
      case Pages.AddFundsToMasterSafeThroughBridge:
        return <AddFundsToMasterSafeThroughBridge />;
      case Pages.LowOperatingBalanceBridgeFunds:
        return <LowOperatingBalanceBridgeFunds />;
      case Pages.LowSafeSignerBalanceBridgeFunds:
        return <LowSafeSignerBalanceBridgeFunds />;

      default:
        return <Main />;
    }
  }, [pageState]);

  return page;
}
