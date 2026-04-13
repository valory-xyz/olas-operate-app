import { useQuery } from '@tanstack/react-query';

import { REACT_QUERY_KEYS, SIXTY_MINUTE_INTERVAL } from '@/constants';
import { useElectronApi } from '@/hooks';

type useAppStatusResult = {
  isOutdated: boolean;
  latestTag: string | null;
  releaseNotes: string | null;
};

export const useAppStatus = () => {
  const { autoUpdater } = useElectronApi();

  return useQuery<useAppStatusResult, Error>({
    queryKey: REACT_QUERY_KEYS.IS_PEARL_OUTDATED_KEY,
    queryFn: ({ signal }): Promise<useAppStatusResult> => {
      if (
        !autoUpdater?.checkForUpdates ||
        !autoUpdater?.onUpdateAvailable ||
        !autoUpdater?.onUpdateNotAvailable
      ) {
        return Promise.reject(new Error('autoUpdater API is not available'));
      }

      return new Promise<useAppStatusResult>((resolve, reject) => {
        let settled = false;

        function cleanup() {
          cleanupAvailable?.();
          cleanupNotAvailable?.();
        }

        const cleanupAvailable = autoUpdater.onUpdateAvailable!((info) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve({
            isOutdated: true,
            latestTag: info.version,
            releaseNotes:
              typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
          });
        });

        const cleanupNotAvailable = autoUpdater.onUpdateNotAvailable!(() => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve({ isOutdated: false, latestTag: null, releaseNotes: null });
        });

        autoUpdater.checkForUpdates!().catch((err: Error) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(err);
        });

        signal?.addEventListener('abort', () => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    },
    refetchInterval: SIXTY_MINUTE_INTERVAL,
    refetchOnWindowFocus: false,
  });
};
