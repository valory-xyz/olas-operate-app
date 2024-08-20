import { useContext } from 'react';

import { SetupPageContext } from '@/context/SetupPageProvider';
import { SetupScreen } from '@/enums/SetupScreen';
import { Address } from '@/types/Address';

export const useSetupPage = () => {
  const { setupObject, setSetupObject } = useContext(SetupPageContext);

  const goto = (state: SetupScreen) => {
    setSetupObject((prev) => ({ ...prev, state }));
  };

  const setMnemonic = (mnemonic: string[]) =>
    setSetupObject((prev) => Object.assign(prev, { mnemonic }));

  const setBackupSigner = (backupSigner: Address) =>
    setSetupObject((prev) => Object.assign(prev, { backupSigner }));

  return {
    ...setupObject,
    setMnemonic,
    setBackupSigner,
    goto,
  };
};
