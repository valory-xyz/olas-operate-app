import { useEffect, useMemo } from 'react';

import { Main } from '@/components/MainPage';
import { ManageStakingPage } from '@/components/ManageStakingPage';
import { AddBackupWalletViaSafePage } from '@/components/Pages/AddBackupWalletViaSafePage';
import { HelpAndSupport } from '@/components/Pages/HelpAndSupportPage';
import { RewardsHistory } from '@/components/RewardsHistory/RewardsHistory';
import { Settings } from '@/components/SettingsPage';
import { Setup } from '@/components/SetupPage';
import { YourWallet } from '@/components/YourWalletPage/YourWallet';
import { Pages } from '@/enums/PageState';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';

const DEFAULT_APP_HEIGHT = 700;

export default function Home() {
  const { pageState } = usePageState();
  const electronApi = useElectronApi();

  useEffect(() => {
    // Notify the main process that the app is loaded
    electronApi?.setIsAppLoaded?.(true);

    // Set the app height to the body scroll height
    function updateAppHeight() {
      const bodyElement = document.querySelector('body');
      if (bodyElement) {
        const scrollHeight = bodyElement.scrollHeight;
        electronApi?.setAppHeight?.(Math.min(DEFAULT_APP_HEIGHT, scrollHeight));
      }
    }

    const resizeObserver = new ResizeObserver(updateAppHeight);
    resizeObserver.observe(document.body);
    updateAppHeight();

    return () => {
      resizeObserver.unobserve(document.body);
    };
  }, [electronApi]);

  const page = useMemo(() => {
    switch (pageState) {
      case Pages.Setup:
        return <Setup />;
      case Pages.Main:
        return <Main />;
      case Pages.Settings:
        return <Settings />;
      case Pages.HelpAndSupport:
        return <HelpAndSupport />;
      case Pages.ManageStaking:
        return <ManageStakingPage />;
      case Pages.YourWalletBreakdown:
        return <YourWallet />;
      case Pages.RewardsHistory:
        return <RewardsHistory />;
      case Pages.AddBackupWalletViaSafe:
        return <AddBackupWalletViaSafePage />;
      default:
        return <Main />;
    }
  }, [pageState]);

  return page;
}
