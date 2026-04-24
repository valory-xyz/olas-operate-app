import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from 'react';

import { Address } from '@/types/Address';

type UpdateBackupWalletContextType = {
  newAddress: Address | null;
  setNewAddress: (address: Address | null) => void;
  password: string | null;
  setPassword: (password: string | null) => void;
  sameAddressError: boolean;
  setSameAddressError: (value: boolean) => void;
  resetFlow: () => void;
};

export const UpdateBackupWalletContext =
  createContext<UpdateBackupWalletContextType>({
    newAddress: null,
    setNewAddress: () => {},
    password: null,
    setPassword: () => {},
    sameAddressError: false,
    setSameAddressError: () => {},
    resetFlow: () => {},
  });

export const UpdateBackupWalletProvider = ({ children }: PropsWithChildren) => {
  const [newAddress, setNewAddress] = useState<Address | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [sameAddressError, setSameAddressError] = useState(false);

  const resetFlow = useCallback(() => {
    setNewAddress(null);
    setPassword(null);
    setSameAddressError(false);
  }, []);

  return (
    <UpdateBackupWalletContext.Provider
      value={{
        newAddress,
        setNewAddress,
        password,
        setPassword,
        sameAddressError,
        setSameAddressError,
        resetFlow,
      }}
    >
      {children}
    </UpdateBackupWalletContext.Provider>
  );
};

export const useUpdateBackupWallet = () =>
  useContext(UpdateBackupWalletContext);
