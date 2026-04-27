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
  // Password captured in SetupPassword and consumed by the backup-wallet
  // eager-write call (useApplyBackupDuringSetup). Held only for the duration
  // of onboarding; cleared as soon as it's used.
  password: string | null;
  setPassword: (password: string | null) => void;
};

export const SetupContext = createContext<SetupContextType>({
  setupObject: {
    state: SETUP_SCREEN.Welcome,
    prevState: null,
    backupSigner: undefined,
  },
  setSetupObject: () => {},
  password: null,
  setPassword: () => {},
});

export const SetupProvider = ({ children }: PropsWithChildren) => {
  const [setupObject, setSetupObject] = useState<SetupObjectType>({
    state: SETUP_SCREEN.Welcome,
    prevState: null,
    backupSigner: undefined,
  });
  const [password, setPassword] = useState<string | null>(null);

  return (
    <SetupContext.Provider
      value={{ setupObject, setSetupObject, password, setPassword }}
    >
      {children}
    </SetupContext.Provider>
  );
};
