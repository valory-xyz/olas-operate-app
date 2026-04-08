import { useQuery } from '@tanstack/react-query';

import { REACT_QUERY_KEYS, SIXTY_MINUTE_INTERVAL } from '@/constants';
import { useElectronApi } from '@/hooks';

type useAppStatusResult = {
  isOutdated: boolean;
  latestTag: string | null;
  releaseNotes: string | null;
};

export const useAppStatus = () => {
  const { updates } = useElectronApi();

  return useQuery<useAppStatusResult, Error>({
    queryKey: REACT_QUERY_KEYS.IS_PEARL_OUTDATED_KEY,
    queryFn: (): Promise<useAppStatusResult> => {
      if (!updates?.checkForUpdates || !updates?.onUpdateAvailable) {
        return Promise.reject(new Error('updates API is not available'));
      }

      return new Promise<useAppStatusResult>((resolve, reject) => {
        let settled = false;

        const cleanupAvailable = updates.onUpdateAvailable!((info) => {
          if (settled) return;
          settled = true;
          cleanupAvailable?.();
          resolve({
            isOutdated: true,
            latestTag: info.version,
            releaseNotes:
              typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
          });
        });

        updates.checkForUpdates!()
          .then(() => {
            if (settled) return;
            settled = true;
            cleanupAvailable?.();
            resolve({ isOutdated: false, latestTag: null, releaseNotes: null });
          })
          .catch((err: Error) => {
            if (settled) return;
            settled = true;
            cleanupAvailable?.();
            reject(err);
          });
      });
    },
    refetchInterval: SIXTY_MINUTE_INTERVAL,
    refetchOnWindowFocus: false,
  });
};
