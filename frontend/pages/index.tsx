import { useEffect, useMemo } from 'react';

import { Main } from '@/components/MainPageV1';
import { Setup } from '@/components/SetupPage';
import { PAGES } from '@/constants';
import { useElectronApi, usePageState } from '@/hooks';

export default function Home() {
  const { pageState } = usePageState();
  const electronApi = useElectronApi();

  useEffect(() => {
    // Notify the main process that the app is loaded
    electronApi?.setIsAppLoaded?.(true);
  }, [electronApi]);

  const page = useMemo(() => {
    switch (pageState) {
      case PAGES.Setup:
        return <Setup />;
      case PAGES.Main:
        return <Main />;

      default:
        return <Main />;
    }
  }, [pageState]);

  return page;
}
