import { useCallback } from 'react';

import { useElectronApi } from '@/hooks';

import { AUTO_RUN_LOG_PREFIX } from '../constants';

/**
 * Hook to log messages related to the auto-run feature
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
