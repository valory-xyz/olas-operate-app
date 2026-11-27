import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useState,
} from 'react';

import { AgentType, SETUP_SCREEN, SetupScreen } from '@/constants';
import { Address, BackupWalletType, Maybe, Nullable } from '@/types';

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
  // Password captured in SetupPassword (new account) or SetupWelcomeLogin (when
  // replacing an ignored Google/Apple pick), and consumed by the backup-wallet
  // eager-write call (useApplyBackupDuringSetup). Cleared once used, or once
  // nothing will use it.
  password: string | null;
  setPassword: (password: string | null) => void;
  // The backup step is replacing a backup whose canonical owner is already set,
  // so the apply must succeed before onboarding moves on.
  isReplacingBackup: boolean;
  setIsReplacingBackup: (isReplacingBackup: boolean) => void;
  // An agent an entry point outside Setup asks AgentOnboarding to open on
  // (the Connect staking announcement). Consumed when AgentOnboarding mounts,
  // so a Back inside Setup opens with nothing selected.
  preselectedAgentType: Nullable<AgentType>;
  setPreselectedAgentType: (agentType: Nullable<AgentType>) => void;
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
  isReplacingBackup: false,
  setIsReplacingBackup: () => {},
  preselectedAgentType: null,
  setPreselectedAgentType: () => {},
});

export const SetupProvider = ({ children }: PropsWithChildren) => {
  const [setupObject, setSetupObject] = useState<SetupObjectType>({
    state: SETUP_SCREEN.Welcome,
    prevState: null,
    backupSigner: undefined,
  });
  const [password, setPassword] = useState<string | null>(null);
  const [isReplacingBackup, setIsReplacingBackup] = useState(false);
  const [preselectedAgentType, setPreselectedAgentType] =
    useState<Nullable<AgentType>>(null);

  return (
    <SetupContext.Provider
      value={{
        setupObject,
        setSetupObject,
        password,
        setPassword,
        isReplacingBackup,
        setIsReplacingBackup,
        preselectedAgentType,
        setPreselectedAgentType,
      }}
    >
      {children}
    </SetupContext.Provider>
  );
};
