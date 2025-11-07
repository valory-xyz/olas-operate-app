import { useCallback } from 'react';

import { useElectronApi } from './useElectronApi';
import { useStore } from './useStore';

/**
 * Hook to check if mnemonic exists for the user.
 *
 * This hook stores the state in the electron store when we detect
 * whether the mnemonic exists or not.
 *
 * @returns Object with mnemonicExists (boolean | undefined) and setMnemonicExists function
 */
export const useMnemonicExists = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();

  const mnemonicExists = storeState?.mnemonicExists;

  const setMnemonicExists = useCallback(
    (exists: boolean) => {
      store?.set?.('mnemonicExists', exists);
    },
    [store],
  );

  return {
    mnemonicExists,
    setMnemonicExists,
  };
};
