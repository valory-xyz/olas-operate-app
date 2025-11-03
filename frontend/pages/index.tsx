import { useEffect, useMemo } from 'react';

import { Main } from '@/components/MainPageV1';
import { Setup } from '@/components/SetupPage';
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

      default:
        return <Main />;
    }
  }, [pageState]);

  return page;
}
