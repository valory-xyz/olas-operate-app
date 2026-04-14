import { useContext } from 'react';

import { SharedContext } from '@/context/SharedProvider/SharedProvider';

/**
 * Hook to track whether a mnemonic exists for the current user session.
 *
 * Backed by shared React context — `mnemonicExists` is not persisted to any store.
 * All call sites share the same value: login handlers set it to true; an app
 * restart clears it (re-login required).
 */
export const useMnemonicExists = () => {
  const { mnemonicExists, setMnemonicExists } = useContext(SharedContext);
  return { mnemonicExists, setMnemonicExists };
};
