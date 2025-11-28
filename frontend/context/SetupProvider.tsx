import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useState,
} from 'react';

import { SETUP_SCREEN, SetupScreen } from '@/constants';
import { Address, BackupWalletType, Maybe } from '@/types';

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
    state: SETUP_SCREEN.Welcome,
    prevState: null,
    backupSigner: undefined,
  },
  setSetupObject: () => {},
});

export const SetupProvider = ({ children }: PropsWithChildren) => {
  const [setupObject, setSetupObject] = useState<SetupObjectType>({
    state: SETUP_SCREEN.Welcome,
    prevState: null,
    backupSigner: undefined,
  });

  return (
    <SetupContext.Provider value={{ setupObject, setSetupObject }}>
      {children}
    </SetupContext.Provider>
  );
};
