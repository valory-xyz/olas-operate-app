import { useEffect, useState } from 'react';

import { useElectronApi } from '@/hooks';

import { useAppStatus } from '../../UpdateAvailableAlert/useAppStatus';

/**
 * Automatically opens the update modal when a new version is detected
 * and the user has not already dismissed it for that version.
 * Returns `{ isOpen, open, close }` so callers can also trigger it manually.
 */
export const useAutoOpenUpdateModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { store } = useElectronApi();
  const { data: appStatusData, isFetched: appStatusFetched } = useAppStatus();

  useEffect(() => {
    if (
      !appStatusFetched ||
      !appStatusData?.isOutdated ||
      !appStatusData?.latestTag
    )
      return;
    if (!store?.get) return;

    const latestTag = appStatusData.latestTag;
    store
      .get('updateAvailableKnownVersion')
      .then((dismissedFor) => {
        if (dismissedFor !== latestTag) {
          setIsOpen(true);
        }
      })
      .catch((error) => {
        console.error('Failed to check update availability:', error);
      });
  }, [
    appStatusFetched,
    appStatusData?.isOutdated,
    appStatusData?.latestTag,
    store,
  ]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
};
