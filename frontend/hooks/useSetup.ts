import { useCallback, useContext } from 'react';

import { SetupContext } from '@/context/SetupProvider';
import { SetupScreen } from '@/enums/SetupScreen';
import { Address } from '@/types/Address';

export const useSetup = () => {
  const { setupObject, setSetupObject } = useContext(SetupContext);

  const goto = useCallback(
    (state: SetupScreen) => {
      setSetupObject((prev) => ({ ...prev, prevState: prev.state, state }));
    },
    [setSetupObject],
  );

  const setMnemonic = useCallback(
    (mnemonic: string[]) => {
      setSetupObject((prev) => Object.assign(prev, { mnemonic }));
    },
    [setSetupObject],
  );

  const setBackupSigner = useCallback(
    (backupSigner: Address) => {
      setSetupObject((prev) => Object.assign(prev, { backupSigner }));
    },
    [setSetupObject],
  );

  return {
    ...setupObject,
    setMnemonic,
    setBackupSigner,
    goto,
  };
};
