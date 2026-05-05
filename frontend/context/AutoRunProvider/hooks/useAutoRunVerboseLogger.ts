import { useCallback } from 'react';

import { AUTO_RUN_VERBOSE_LOGS } from '../constants';

type LogMessage = (message: string) => void;

/**
 * Returns a logger that only emits when verbose auto-run logs are enabled.
 */
export const useAutoRunVerboseLogger = (logMessage: LogMessage) =>
  useCallback(
    (message: string) => {
      if (AUTO_RUN_VERBOSE_LOGS) {
        logMessage(message);
      }
    },
    [logMessage],
  );
