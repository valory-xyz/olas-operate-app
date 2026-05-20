import { useEffect, useRef } from 'react';

import { useElectronApi } from './useElectronApi';
import { useStore } from './useStore';

/**
 * Manages the OS wake lock via Electron's powerSaveBlocker IPC.
 *
 * The wake lock is active only when both conditions are true:
 * - `enabled` (auto-run is on)
 * - `keepDeviceAwake` (user toggle in settings)
 *
 * Effect body calls wake-lock-start when shouldLock is true.
 * Cleanup calls wake-lock-stop only when a lock was previously started,
 * avoiding a needless IPC round-trip on initial mount or when shouldLock
 * was always false.
 */
export const useWakeLock = (enabled: boolean) => {
  const { wakeLock } = useElectronApi();
  const { storeState } = useStore();

  const keepDeviceAwake = !!storeState?.keepDeviceAwake;
  const shouldLock = keepDeviceAwake && enabled;
  const wasLockedRef = useRef(false);

  useEffect(() => {
    if (shouldLock) {
      wakeLock?.start?.();
      wasLockedRef.current = true;
    }

    return () => {
      if (wasLockedRef.current) {
        wakeLock?.stop?.();
        wasLockedRef.current = false;
      }
    };
  }, [shouldLock, wakeLock]);
};
