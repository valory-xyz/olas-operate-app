import { QueryObserverBaseResult, useQuery } from '@tanstack/react-query';
import { getAddress, isAddress } from 'ethers/lib/utils';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import {
  AllEvmChainId,
  FIVE_SECONDS_INTERVAL,
  MasterEoa,
  MasterSafe,
  MasterWallet,
  REACT_QUERY_KEYS,
  WALLET_OWNER,
  WALLET_TYPE,
} from '@/constants';
import { WalletService } from '@/service/Wallet';
import { MiddlewareWalletResponse } from '@/types';
import { asEvmChainId } from '@/utils/middlewareHelpers';

import { OnlineStatusContext } from './OnlineStatusProvider';

type MasterWalletContext = {
  masterEoa?: MasterEoa;
  /** master safes of all chains */
  masterSafes?: MasterSafe[];
  masterWallets?: MasterWallet[];
  /** Get the master safe for a specific chain ID */
  getMasterSafeOf?: (chainId: AllEvmChainId) => MasterSafe | undefined;
} & Partial<QueryObserverBaseResult<MasterWallet[]>>;

export const MasterWalletContext = createContext<MasterWalletContext>({});

const transformMiddlewareWalletResponse = (
  data: MiddlewareWalletResponse[],
) => {
  const result: MasterWallet[] = [];

  data.forEach((response) => {
    if (getAddress(response.address)) {
      result.push({
        address: response.address,
        owner: WALLET_OWNER.Master,
        type: WALLET_TYPE.EOA,
      });
    }

    Object.entries(response.safes).forEach(([middlewareChain, safeAddress]) => {
      if (getAddress(safeAddress)) {
        result.push({
          address: safeAddress,
          evmChainId: asEvmChainId(middlewareChain),
          owner: WALLET_OWNER.Master,
          type: WALLET_TYPE.Safe,
        });
      }
    });
  }, []);

  return result;
};

export const MasterWalletProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);

  const {
    data: masterWallets,
    refetch,
    isFetched,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.WALLETS_KEY,
    queryFn: ({ signal }) => WalletService.getWallets(signal),
    refetchInterval: isOnline ? FIVE_SECONDS_INTERVAL : false,
    select: (data) =>
      transformMiddlewareWalletResponse(data).filter(
        (wallet) =>
          wallet.owner === WALLET_OWNER.Master && isAddress(wallet.address),
      ),
  });

  const masterEoa = useMemo(
    () =>
      masterWallets?.find(
        (wallet): wallet is MasterEoa =>
          wallet.type === WALLET_TYPE.EOA &&
          wallet.owner === WALLET_OWNER.Master,
      ),
    [masterWallets],
  );

  const masterSafes = useMemo(
    () =>
      masterWallets?.filter(
        (wallet): wallet is MasterSafe =>
          wallet.type === WALLET_TYPE.Safe &&
          wallet.owner === WALLET_OWNER.Master,
      ),
    [masterWallets],
  );

  const getMasterSafeOf = useCallback(
    (chainId: AllEvmChainId) =>
      masterSafes?.find((safe) => safe.evmChainId === chainId),
    [masterSafes],
  );

  return (
    <MasterWalletContext.Provider
      value={{
        masterWallets,
        masterEoa,
        masterSafes,
        refetch,
        isFetched,
        getMasterSafeOf,
      }}
    >
      {children}
    </MasterWalletContext.Provider>
  );
};
