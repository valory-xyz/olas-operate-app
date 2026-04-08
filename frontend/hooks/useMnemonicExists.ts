import { useCallback, useState } from 'react';

/**
 * Hook to track whether a mnemonic exists for the current user session.
 *
 * Backed by React state only — `mnemonicExists` is not persisted to any store.
 * Login handlers set it to true; an app restart clears it (re-login required).
 * Consumers that render conditionally on this value already handle `undefined`
 * gracefully (they return null when the value is falsy).
 */
export const useMnemonicExists = () => {
  const [mnemonicExists, setMnemonicExists] = useState<boolean | undefined>(
    undefined,
  );

  const handleSetMnemonicExists = useCallback((exists: boolean) => {
    setMnemonicExists(exists);
  }, []);

  return {
    mnemonicExists,
    setMnemonicExists: handleSetMnemonicExists,
  };
};
