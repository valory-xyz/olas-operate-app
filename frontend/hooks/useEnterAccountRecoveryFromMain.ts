import { useCallback } from 'react';

import { PAGES, SETUP_SCREEN } from '@/constants';

import { usePageState } from './usePageState';
import { useSetup } from './useSetup';

/**
 * Navigates from Main (Settings) to the AccountRecovery setup screen.
 * Used by the "Forgot your password?" link in the Settings Update Password form.
 */
export const useEnterAccountRecoveryFromMain = () => {
  const { goto } = useSetup();
  const { goto: gotoPage } = usePageState();

  return useCallback(() => {
    goto(SETUP_SCREEN.AccountRecovery);
    gotoPage(PAGES.Setup);
  }, [goto, gotoPage]);
};
