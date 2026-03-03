import { useCallback } from 'react';

import { useElectronApi } from '@/hooks';

import { AUTO_RUN_LOG_PREFIX } from '../constants';

/**
 * Auto-run logger adapter.
 *
 * Example output in electron logs:
 * `autorun:: rotation triggered: optimus earned rewards`
 */
export const useLogAutoRunEvent = () => {
  const { logEvent } = useElectronApi();

  const logMessage = useCallback(
    (message: string) => {
      logEvent?.(`${AUTO_RUN_LOG_PREFIX}: ${message}`);
    },
    [logEvent],
  );

  return { logMessage };
};
