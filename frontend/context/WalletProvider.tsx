import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from 'react';
import { useInterval } from 'usehooks-ts';

import { MiddlewareChain, Wallet } from '@/client';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { WalletService } from '@/service/Wallet';
import { Address } from '@/types/Address';

import { OnlineStatusContext } from './OnlineStatusProvider';

export const WalletContext = createContext<{
  masterEoaAddress?: Address;
  masterSafeAddress?: Address;
  masterSafeAddresses?: Record<MiddlewareChain, Address>;
  wallets?: Wallet[];
  updateWallets: () => Promise<void>;
  masterSafeAddressKeyExistsForChain: (
    middlewareChain: MiddlewareChain,
  ) => boolean;
}>({
  masterEoaAddress: undefined,
  masterSafeAddress: undefined,
  wallets: undefined,
  updateWallets: async () => {},
  masterSafeAddressKeyExistsForChain: () => false,
});

export const WalletProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);

  const [wallets, setWallets] = useState<Wallet[]>();

  const masterEoaAddress: Address | undefined = wallets?.[0]?.address;
  const masterSafeAddress: Address | undefined =
    wallets?.[0]?.safes[MiddlewareChain.OPTIMISM];

  const masterSafeAddresses = wallets?.[0]?.safes;

  const masterSafeAddressKeyExistsForChain = useCallback(
    (middlewareChain: MiddlewareChain) =>
      !!wallets?.[0]?.safes[middlewareChain],
    [wallets],
  );

  const updateWallets = async () => {
    try {
      const wallets = await WalletService.getWallets();
      setWallets(wallets);
    } catch (e) {
      console.error(e);
    }
  };

  useInterval(updateWallets, isOnline ? FIVE_SECONDS_INTERVAL : null);

  return (
    <WalletContext.Provider
      value={{
        masterEoaAddress,
        masterSafeAddress,
        masterSafeAddresses,
        wallets,
        updateWallets,
        masterSafeAddressKeyExistsForChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
