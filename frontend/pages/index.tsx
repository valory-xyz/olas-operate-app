import { useEffect, useMemo } from 'react';

import { HelpAndSupport } from '@/components/HelpAndSupportPage';
import { Main } from '@/components/MainPage';
import { ManageStakingPage } from '@/components/ManageStakingPage';
import { Settings } from '@/components/SettingsPage';
import { Setup } from '@/components/SetupPage';
import { SettingsPageProvider } from '@/context/SettingsPageProvider';
import { SetupPageProvider } from '@/context/SetupPageProvider';
import { Pages } from '@/enums/PageState';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';

const DEFAULT_APP_HEIGHT = 700;

export default function Home() {
  const { pageState } = usePageState();
  const electronApi = useElectronApi();

  useEffect(() => {
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
        return (
          <SetupPageProvider>
            <Setup />
          </SetupPageProvider>
        );
      case Pages.Main:
        return <Main />;
      case Pages.Settings:
        return (
          <SettingsPageProvider>
            <Settings />
          </SettingsPageProvider>
        );
      case Pages.HelpAndSupport:
        return <HelpAndSupport />;
      case Pages.ManageStaking:
        return <ManageStakingPage />;
      default:
        return null;
    }
  }, [pageState]);

  return page;
}
