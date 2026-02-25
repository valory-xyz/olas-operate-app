import { useCallback } from 'react';

import { useElectronApi } from '@/hooks';

import { AUTO_RUN_LOG_PREFIX } from '../constants';

export const useLogAutoRunEvent = () => {
  const { logEvent } = useElectronApi();

  const logMessage = useCallback(
    (message: string) => {
      if (typeof window !== 'undefined') {
        window.console.log(`[auto-run] ${message}`);
      }
      logEvent?.(`${AUTO_RUN_LOG_PREFIX}: ${message}`);
    },
    [logEvent],
  );

  return { logMessage };
};
