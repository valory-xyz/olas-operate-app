import { useCallback, useMemo } from 'react';

import { useElectronApi } from './useElectronApi';
import { useStore } from './useStore';

/**
 * Hook to check if mnemonic exists for the user.
 *
 * This hook stores the state in the electron store when we detect
 * that the mnemonic doesn't exist
 *
 * @returns Object with mnemonicExists (boolean | undefined) and setMnemonicExists function
 */
export const useMnemonicExists = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();

  const mnemonicDoesNotExist = storeState?.mnemonicDoesNotExist;

  const mnemonicExists = useMemo(() => {
    if (mnemonicDoesNotExist === true) {
      return false;
    }

    return true;
  }, [mnemonicDoesNotExist]);

  const setMnemonicDoesNotExist = useCallback(
    (doesNotExist: boolean) => {
      store?.set?.('mnemonicDoesNotExist', doesNotExist);
    },
    [store],
  );

  return {
    mnemonicExists,
    setMnemonicDoesNotExist,
  };
};
