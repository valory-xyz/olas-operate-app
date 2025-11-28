import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useState,
} from 'react';

import { SetupScreen } from '@/constants/setupScreens';
import { Address } from '@/types/Address';
import { BackupWalletType } from '@/types/BackupWallet';
import { Maybe } from '@/types/Util';

type SetupObjectType = {
  state: SetupScreen;
  prevState: Maybe<SetupScreen>;
  backupSigner?: {
    address: Address;
    type: BackupWalletType;
  };
};

type SetupContextType = {
  setupObject: SetupObjectType;
  setSetupObject: Dispatch<SetStateAction<SetupObjectType>>;
};

export const SetupContext = createContext<SetupContextType>({
  setupObject: {
    state: SetupScreen.Welcome,
    prevState: null,
    backupSigner: undefined,
  },
  setSetupObject: () => {},
});

export const SetupProvider = ({ children }: PropsWithChildren) => {
  const [setupObject, setSetupObject] = useState<SetupObjectType>({
    state: SetupScreen.Welcome,
    prevState: null,
    backupSigner: undefined,
  });

  return (
    <SetupContext.Provider value={{ setupObject, setSetupObject }}>
      {children}
    </SetupContext.Provider>
  );
};
