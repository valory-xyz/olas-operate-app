import { useCallback, useEffect, useMemo } from 'react';

import { HelpAndSupport } from '@/components/HelpAndSupport';
import { Main } from '@/components/Main';
import { Settings } from '@/components/Settings';
import { Setup } from '@/components/Setup';
import { PageState } from '@/enums/PageState';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';

const DEFAULT_APP_HEIGHT = 700;

export default function Home() {
  const { pageState } = usePageState();
  const electronApi = useElectronApi();

  const updateAppHeight = useCallback(() => {
    const bodyElement = document.querySelector('body');
    if (bodyElement) {
      const scrollHeight = bodyElement.scrollHeight;
      electronApi?.setAppHeight?.(Math.min(DEFAULT_APP_HEIGHT, scrollHeight));
    }
  }, [electronApi]);

  useEffect(() => {
    // set the flag to check for updates on app start
    electronApi?.store?.set?.('canCheckForUpdates', true);

    // Runs only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(updateAppHeight);
    resizeObserver.observe(document.body);
    updateAppHeight();

    return () => {
      resizeObserver.unobserve(document.body);
    };
  }, [electronApi, updateAppHeight]);

  const page = useMemo(() => {
    switch (pageState) {
      case PageState.Setup:
        return <Setup />;
      case PageState.Main:
        return <Main />;
      case PageState.Settings:
        return <Settings />;
      case PageState.HelpAndSupport:
        return <HelpAndSupport />;
      default:
        return <Main />;
    }
  }, [pageState]);

  return page;
}
