import { QueryObserverBaseResult, useQuery } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useContext, useState } from 'react';

import { MiddlewareWalletResponse } from '@/client';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import {
  MasterEoa,
  MasterSafe,
  MasterWallets,
  WalletOwnerType,
  WalletType,
} from '@/enums/Wallet';
import { UsePause } from '@/hooks/usePause';
import { WalletService } from '@/service/Wallet';
import { convertMiddlewareChainToChainId } from '@/utils/middlewareHelpers';

import { OnlineStatusContext } from './OnlineStatusProvider';

type WalletContextType = {
  wallets?: (MasterEoa | MasterSafe)[];
} & Partial<QueryObserverBaseResult<(MasterEoa | MasterSafe)[]>> &
  UsePause;

export const WalletContext = createContext<WalletContextType>({
  wallets: undefined,
  paused: false,
  setPaused: () => {},
  togglePaused: () => {},
});

const transformMiddlewareWalletResponse = (
  data: MiddlewareWalletResponse,
): MasterWallets => {
  const masterEoa: MasterEoa = {
    address: data.address,
    owner: WalletOwnerType.Master,
    type: WalletType.EOA,
  };

  const masterSafes: MasterSafe[] = Object.entries(data.safes).map(
    ([middlewareChain, address]) => ({
      address,
      chainId: convertMiddlewareChainToChainId(+middlewareChain),
      owner: WalletOwnerType.Master,
      type: WalletType.Safe,
    }),
  );

  return [masterEoa, ...masterSafes];
};

export const WalletProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);

  const [paused, setPaused] = useState(false);

  const { data: wallets, refetch } = useQuery({
    queryKey: REACT_QUERY_KEYS.WALLETS_KEY,
    queryFn: WalletService.getWallets,
    refetchInterval: isOnline && !paused ? FIVE_SECONDS_INTERVAL : false,
    select: (data) => transformMiddlewareWalletResponse(data),
  });

  return (
    <WalletContext.Provider
      value={{
        wallets,
        setPaused,
        paused,
        togglePaused: () => setPaused((prev) => !prev),
        refetch,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
