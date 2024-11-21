import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from 'react';
import { useInterval } from 'usehooks-ts';

import { Wallet } from '@/client';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { WalletService } from '@/service/Wallet';
import { Address } from '@/types/Address';

import { OnlineStatusContext } from './OnlineStatusProvider';

export const WalletContext = createContext<{
  masterEoaAddress?: Address;
  masterSafeAddress?: Address;
  wallets?: Wallet[];
  updateWallets: () => Promise<void>;
}>({
  masterEoaAddress: undefined,
  masterSafeAddress: undefined,
  wallets: undefined,
  updateWallets: async () => {},
});

export const WalletProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);

  const [wallets, setWallets] = useState<Wallet[]>();

  const masterEoaAddress: Address | undefined = wallets?.[0]?.address;
  const masterSafeAddress: Address | undefined = wallets?.[0]?.safe;

  const updateWallets = useCallback(async () => {
    try {
      const wallets = await WalletService.getWallets();
      setWallets(wallets);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useInterval(updateWallets, isOnline ? FIVE_SECONDS_INTERVAL : null);

  return (
    <WalletContext.Provider
      value={{
        masterEoaAddress,
        masterSafeAddress,
        wallets,
        updateWallets,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
