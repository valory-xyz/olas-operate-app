import { useEffect, useState } from 'react';

import {
  EVICTION_RUN_START_MARGIN_SECONDS,
  runsInsideEvictionWindow,
} from '@/utils/stakingProgram';

/** `setTimeout` fires at once for a longer delay; a later timer is re-armed. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * `runsInsideEvictionWindow` for the selected agent, re-rendered when the
 * margin before the end of the eviction is reached, so a run that could cross
 * into a re-stake is gated again without waiting for another input to change.
 */
export const useRunsInsideEvictionWindow = ({
  isAgentEvicted,
  canRunWhileEvicted,
  evictionExpiresAt,
}: {
  isAgentEvicted: boolean;
  canRunWhileEvicted: boolean | undefined;
  /** When the eviction ends, in seconds; 0 when unknown. */
  evictionExpiresAt: number;
}): boolean => {
  const [tick, setTick] = useState(0);
  const runsEvicted = runsInsideEvictionWindow({
    isAgentEvicted,
    canRunWhileEvicted,
    evictionExpiresAt,
    nowSeconds: Math.round(Date.now() / 1000),
  });

  useEffect(() => {
    if (!runsEvicted) return;
    const marginStartMs =
      (evictionExpiresAt - EVICTION_RUN_START_MARGIN_SECONDS) * 1000;
    const delayMs = Math.min(
      Math.max(marginStartMs - Date.now(), 0) + 1000,
      MAX_TIMEOUT_MS,
    );
    const timer = setTimeout(() => setTick((value) => value + 1), delayMs);
    return () => clearTimeout(timer);
  }, [runsEvicted, evictionExpiresAt, tick]);

  return runsEvicted;
};
