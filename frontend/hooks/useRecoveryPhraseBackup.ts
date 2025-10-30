import { useCallback } from 'react';

import { useElectronApi } from './useElectronApi';
import { useStore } from './useStore';

export const useRecoveryPhraseBackup = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();

  const isBackedUp = !!storeState?.recoveryPhraseBackedUp;

  const markAsBackedUp = useCallback(() => {
    if (!isBackedUp) {
      store?.set?.('recoveryPhraseBackedUp', true);
    }
  }, [store, isBackedUp]);

  return {
    isBackedUp,
    markAsBackedUp,
  };
};
