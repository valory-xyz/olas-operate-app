import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from 'react';

type AddBackupWalletContextType = {
  password: string | null;
  setPassword: (password: string | null) => void;
  resetFlow: () => void;
};

export const AddBackupWalletContext = createContext<AddBackupWalletContextType>(
  {
    password: null,
    setPassword: () => {},
    resetFlow: () => {},
  },
);

export const AddBackupWalletProvider = ({ children }: PropsWithChildren) => {
  const [password, setPassword] = useState<string | null>(null);

  const resetFlow = useCallback(() => {
    setPassword(null);
  }, []);

  return (
    <AddBackupWalletContext.Provider
      value={{ password, setPassword, resetFlow }}
    >
      {children}
    </AddBackupWalletContext.Provider>
  );
};

export const useAddBackupWallet = () => useContext(AddBackupWalletContext);
