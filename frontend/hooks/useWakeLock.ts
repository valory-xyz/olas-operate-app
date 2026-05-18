import { useEffect } from 'react';

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
 * Cleanup always calls wake-lock-stop — handles transitions and unmount.
 */
export const useWakeLock = (enabled: boolean) => {
  const { ipcRenderer } = useElectronApi();
  const { storeState } = useStore();

  const keepDeviceAwake = !!storeState?.keepDeviceAwake;
  const shouldLock = keepDeviceAwake && enabled;

  useEffect(() => {
    if (shouldLock) {
      ipcRenderer?.invoke('wake-lock-start');
    }

    return () => {
      ipcRenderer?.invoke('wake-lock-stop');
    };
  }, [shouldLock, ipcRenderer]);
};
