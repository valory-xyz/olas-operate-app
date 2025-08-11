import { useEffect, useMemo } from 'react';

import { AddFundsToMasterSafeThroughBridge } from '@/components/AddFundsThroughBridge/AddFundsToMasterSafeThroughBridge';
import { LowOperatingBalanceBridgeFunds } from '@/components/AddFundsThroughBridge/LowOperatingBalanceBridgeFunds';
import { LowSafeSignerBalanceBridgeFunds } from '@/components/AddFundsThroughBridge/LowSafeSignerBalanceBridgeFunds';
import { AgentActivityPage } from '@/components/AgentActivity';
import { AgentSelection } from '@/components/AgentSelection';
import { Main } from '@/components/MainPageV1';
import { ManageStakingPage } from '@/components/ManageStakingPage';
import { AddBackupWalletViaSafePage } from '@/components/Pages/AddBackupWalletViaSafePage';
import { HelpAndSupport } from '@/components/Pages/HelpAndSupportPage';
import { RewardsHistory } from '@/components/RewardsHistory/RewardsHistory';
import { Settings } from '@/components/SettingsPage';
import { Setup } from '@/components/SetupPage';
import { UpdateAgentPage } from '@/components/UpdateAgentPage';
import { YourWalletPage } from '@/components/YourWalletPage';
import { Pages } from '@/enums/Pages';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';

export default function Home() {
  const { pageState, goto } = usePageState();
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
      case Pages.SwitchAgent:
        return <AgentSelection onPrev={() => goto(Pages.Main)} />;
      case Pages.Settings:
        return <Settings />;
      case Pages.HelpAndSupport:
        return <HelpAndSupport />;
      case Pages.ManageStaking:
        return <ManageStakingPage />;
      case Pages.ManageWallet:
        return <YourWalletPage />;
      case Pages.RewardsHistory:
        return <RewardsHistory />;
      case Pages.AddBackupWalletViaSafe:
        return <AddBackupWalletViaSafePage />;
      case Pages.AgentActivity:
        return <AgentActivityPage />;
      case Pages.UpdateAgentTemplate:
        return <UpdateAgentPage />;

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
  }, [pageState, goto]);

  return page;
}
