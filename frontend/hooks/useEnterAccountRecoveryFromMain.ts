import { useCallback } from 'react';

import { PAGES, SETUP_SCREEN } from '@/constants';

import { usePageState } from './usePageState';
import { useSetup } from './useSetup';

/**
 * Bridges Settings → AccountRecovery cross-flow navigation.
 * Returns a single function that switches from the Main page to
 * the Setup page at the AccountRecovery screen.
 */
export const useEnterAccountRecoveryFromMain = () => {
  const { goto: gotoSetup } = useSetup();
  const { goto: gotoPage } = usePageState();

  return useCallback(() => {
    gotoSetup(SETUP_SCREEN.AccountRecovery);
    gotoPage(PAGES.Setup);
  }, [gotoSetup, gotoPage]);
};
