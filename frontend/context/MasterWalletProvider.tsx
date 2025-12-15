import { QueryObserverBaseResult, useQuery } from '@tanstack/react-query';
import { getAddress, isAddress } from 'ethers/lib/utils';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { AllEvmChainId } from '@/constants';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import {
  MasterEoa,
  MasterSafe,
  MasterWallet,
  WalletOwnerType,
  WalletType,
} from '@/enums/Wallet';
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
        owner: WalletOwnerType.Master,
        type: WalletType.EOA,
      });
    }

    Object.entries(response.safes).forEach(([middlewareChain, safeAddress]) => {
      if (getAddress(safeAddress)) {
        result.push({
          address: safeAddress,
          evmChainId: asEvmChainId(middlewareChain),
          owner: WalletOwnerType.Master,
          type: WalletType.Safe,
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
          wallet.owner === WalletOwnerType.Master && isAddress(wallet.address),
      ),
  });

  const masterEoa = useMemo(
    () =>
      masterWallets?.find(
        (wallet): wallet is MasterEoa =>
          wallet.type === WalletType.EOA &&
          wallet.owner === WalletOwnerType.Master,
      ),
    [masterWallets],
  );

  const masterSafes = useMemo(
    () =>
      masterWallets?.filter(
        (wallet): wallet is MasterSafe =>
          wallet.type === WalletType.Safe &&
          wallet.owner === WalletOwnerType.Master,
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
