import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useState,
} from 'react';

import { SetupScreen } from '@/enums/SetupScreen';
import { Address } from '@/types/Address';

type SetupObject = {
  state: SetupScreen;
  mnemonic: string[];
  backupSigner?: Address;
};

type SetupPageContextType = {
  setupObject: SetupObject;
  setSetupObject: Dispatch<SetStateAction<SetupObject>>;
};

export const SetupPageContext = createContext<SetupPageContextType>({
  setupObject: {
    state: SetupScreen.Welcome,
    mnemonic: [],
    backupSigner: undefined,
  },
  setSetupObject: () => {},
});

export const SetupPageProvider = ({ children }: PropsWithChildren) => {
  const [setupObject, setSetupObject] = useState<SetupObject>({
    state: SetupScreen.Welcome,
    mnemonic: [],
    backupSigner: undefined,
  });

  return (
    <SetupPageContext.Provider value={{ setupObject, setSetupObject }}>
      {children}
    </SetupPageContext.Provider>
  );
};
