import { message } from 'antd';
import { isAddress } from 'ethers/lib/utils';
import { isNumber } from 'lodash';
import { ValueOf } from 'next/dist/shared/lib/constants';
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useInterval } from 'usehooks-ts';

import { Wallet } from '@/client';
import { CHAINS } from '@/constants/chains';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import {
  LOW_AGENT_SAFE_BALANCE,
  LOW_MASTER_SAFE_BALANCE,
} from '@/constants/thresholds';
import { TOKENS } from '@/constants/tokens';
import { ServiceRegistryL2ServiceState } from '@/enums/ServiceRegistryL2ServiceState';
import { Token } from '@/enums/Token';
import { AutonolasService } from '@/service/Autonolas';
import { EthersService } from '@/service/Ethers';
import MulticallService from '@/service/Multicall';
import { Address } from '@/types/Address';
import {
  AddressNumberRecord,
  WalletAddressNumberRecord,
} from '@/types/Records';

import { OnlineStatusContext } from './OnlineStatusProvider';
import { RewardContext } from './RewardProvider';
import { ServicesContext } from './ServicesProvider';
import { WalletContext } from './WalletProvider';

export const BalanceContext = createContext<{
  isLoaded: boolean;
  setIsLoaded: Dispatch<SetStateAction<boolean>>;
  isBalanceLoaded: boolean;
  olasBondBalance?: number;
  olasDepositBalance?: number;
  eoaBalance?: ValueOf<WalletAddressNumberRecord>;
  safeBalance?: ValueOf<WalletAddressNumberRecord>;
  totalEthBalance?: number;
  totalOlasBalance?: number;
  isLowBalance: boolean;
  wallets?: Wallet[];
  walletBalances: WalletAddressNumberRecord;
  agentSafeBalance?: ValueOf<WalletAddressNumberRecord>;
  agentEoaBalance?: ValueOf<WalletAddressNumberRecord>;
  updateBalances: () => Promise<void>;
  setIsPaused: Dispatch<SetStateAction<boolean>>;
  totalOlasStakedBalance?: number;
}>({
  isLoaded: false,
  setIsLoaded: () => {},
  isBalanceLoaded: false,
  olasBondBalance: undefined,
  olasDepositBalance: undefined,
  eoaBalance: undefined,
  safeBalance: undefined,
  totalEthBalance: undefined,
  totalOlasBalance: undefined,
  isLowBalance: false,
  wallets: undefined,
  walletBalances: {},
  agentSafeBalance: undefined,
  agentEoaBalance: undefined,
  updateBalances: async () => {},
  setIsPaused: () => {},
  totalOlasStakedBalance: undefined,
});

export const BalanceProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { wallets, masterEoaAddress, masterSafeAddress } =
    useContext(WalletContext);
  const { services, serviceAddresses } = useContext(ServicesContext);
  const { optimisticRewardsEarnedForEpoch, accruedServiceStakingRewards } =
    useContext(RewardContext);

  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [olasDepositBalance, setOlasDepositBalance] = useState<number>();
  const [olasBondBalance, setOlasBondBalance] = useState<number>();
  const [isBalanceLoaded, setIsBalanceLoaded] = useState<boolean>(false);
  const [walletBalances, setWalletBalances] =
    useState<WalletAddressNumberRecord>({});

  const totalEthBalance: number | undefined = useMemo(() => {
    if (!isLoaded) return;
    return Object.values(walletBalances).reduce(
      (acc: number, walletBalance) => acc + walletBalance.ETH,
      0,
    );
  }, [isLoaded, walletBalances]);

  const totalOlasBalance: number | undefined = useMemo(() => {
    if (!isLoaded) return;

    const sumWalletBalances = Object.values(walletBalances).reduce(
      (acc: number, walletBalance) => acc + walletBalance.OLAS,
      0,
    );

    const total =
      sumWalletBalances +
      (olasDepositBalance ?? 0) +
      (olasBondBalance ?? 0) +
      (optimisticRewardsEarnedForEpoch ?? 0) +
      (accruedServiceStakingRewards ?? 0);

    return total;
  }, [
    accruedServiceStakingRewards,
    isLoaded,
    olasBondBalance,
    olasDepositBalance,
    optimisticRewardsEarnedForEpoch,
    walletBalances,
  ]);

  const totalOlasStakedBalance: number | undefined = useMemo(() => {
    if (!isLoaded) return;
    return (olasBondBalance ?? 0) + (olasDepositBalance ?? 0);
  }, [isLoaded, olasBondBalance, olasDepositBalance]);

  const updateBalances = useCallback(async (): Promise<void> => {
    if (!masterEoaAddress) return;
    if (!serviceAddresses) return;

    try {
      const walletAddresses: Address[] = [];
      if (isAddress(masterEoaAddress)) walletAddresses.push(masterEoaAddress);
      if (isAddress(`${masterSafeAddress}`))
        walletAddresses.push(masterSafeAddress as Address);
      if (serviceAddresses)
        walletAddresses.push(...serviceAddresses.filter(isAddress));

      const walletBalances = await getWalletBalances(walletAddresses);
      if (!walletBalances) return;

      setWalletBalances(walletBalances);

      const serviceId =
        services?.[0]?.chain_configs[CHAINS.GNOSIS.chainId].chain_data.token;

      if (!isNumber(serviceId)) {
        setIsLoaded(true);
        setIsBalanceLoaded(true);
        return;
      }

      if (isAddress(`${masterSafeAddress}`) && serviceId > 0) {
        const { depositValue, bondValue, serviceState } =
          await AutonolasService.getServiceRegistryInfo(
            masterSafeAddress as Address,
            serviceId,
          );

        switch (serviceState) {
          case ServiceRegistryL2ServiceState.NonExistent:
            setOlasBondBalance(0);
            setOlasDepositBalance(0);
            break;
          case ServiceRegistryL2ServiceState.PreRegistration:
            setOlasBondBalance(0);
            setOlasDepositBalance(0);
            break;
          case ServiceRegistryL2ServiceState.ActiveRegistration:
            setOlasBondBalance(0);
            setOlasDepositBalance(depositValue);
            break;
          case ServiceRegistryL2ServiceState.FinishedRegistration:
            setOlasBondBalance(bondValue);
            setOlasDepositBalance(depositValue);
            break;
          case ServiceRegistryL2ServiceState.Deployed:
            setOlasBondBalance(bondValue);
            setOlasDepositBalance(depositValue);
            break;
          case ServiceRegistryL2ServiceState.TerminatedBonded:
            setOlasBondBalance(bondValue);
            setOlasDepositBalance(0);
            break;
        }
      }

      // update balance loaded state
      setIsLoaded(true);
      setIsBalanceLoaded(true);
    } catch (error) {
      console.error(error);
      message.error('Unable to retrieve wallet balances');
      setIsBalanceLoaded(true);
    }
  }, [masterEoaAddress, masterSafeAddress, serviceAddresses, services]);

  const agentEoaAddress = useMemo(
    () =>
      services?.[0].chain_configs?.[CHAINS.GNOSIS.chainId]?.chain_data
        ?.instances?.[0],
    [services],
  );

  const eoaBalance = useMemo(
    () => masterEoaAddress && walletBalances[masterEoaAddress],
    [masterEoaAddress, walletBalances],
  );
  const safeBalance = useMemo(
    () => masterSafeAddress && walletBalances[masterSafeAddress],
    [masterSafeAddress, walletBalances],
  );
  const agentSafeBalance = useMemo(
    () =>
      services?.[0]?.chain_configs[CHAINS.GNOSIS.chainId].chain_data
        ?.multisig &&
      walletBalances[
        services[0].chain_configs[CHAINS.GNOSIS.chainId].chain_data.multisig!
      ],
    [services, walletBalances],
  );
  const agentEoaBalance = useMemo(
    () => agentEoaAddress && walletBalances[agentEoaAddress],
    [agentEoaAddress, walletBalances],
  );

  const isLowBalance = useMemo(() => {
    if (!safeBalance || !agentSafeBalance) return false;
    if (
      safeBalance.ETH < LOW_MASTER_SAFE_BALANCE &&
      // Need to check agentSafe balance as well, because it's auto-funded from safeBalance
      agentSafeBalance.ETH < LOW_AGENT_SAFE_BALANCE
    )
      return true;
    return false;
  }, [safeBalance, agentSafeBalance]);

  useInterval(
    () => {
      updateBalances();
    },
    isPaused || !isOnline ? null : FIVE_SECONDS_INTERVAL,
  );

  return (
    <BalanceContext.Provider
      value={{
        isLoaded,
        setIsLoaded,
        isBalanceLoaded,
        olasBondBalance,
        olasDepositBalance,
        eoaBalance,
        safeBalance,
        totalEthBalance,
        totalOlasBalance,
        isLowBalance,
        wallets,
        walletBalances,
        agentSafeBalance,
        agentEoaBalance,
        updateBalances,
        setIsPaused,
        totalOlasStakedBalance,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
};

export const getEthBalances = async (
  walletAddresses: Address[],
): Promise<AddressNumberRecord | undefined> => {
  const rpcIsValid = await EthersService.checkRpc(`${process.env.GNOSIS_RPC}`);
  if (!rpcIsValid) return;

  const ethBalances = await MulticallService.getEthBalances(walletAddresses);

  return ethBalances;
};

export const getOlasBalances = async (
  walletAddresses: Address[],
): Promise<AddressNumberRecord | undefined> => {
  const rpcIsValid = await EthersService.checkRpc(`${process.env.GNOSIS_RPC}`);
  if (!rpcIsValid) return;

  const olasBalances = await MulticallService.getErc20Balances(
    walletAddresses,
    TOKENS.gnosis.OLAS,
  );

  return olasBalances;
};

export const getWalletAddresses = (
  wallets: Wallet[],
  serviceAddresses: Address[],
): Address[] => {
  const walletsToCheck: Address[] = [];

  for (const wallet of wallets) {
    const { address, safe } = wallet;
    if (address && isAddress(address)) {
      walletsToCheck.push(address);
    }
    if (safe && isAddress(safe)) {
      walletsToCheck.push(safe);
    }
  }

  for (const serviceAddress of serviceAddresses) {
    if (serviceAddress && isAddress(`${serviceAddress}`)) {
      walletsToCheck.push(serviceAddress);
    }
  }

  return walletsToCheck;
};

export const getWalletBalances = async (
  walletAddresses: Address[],
): Promise<WalletAddressNumberRecord | undefined> => {
  const [ethBalances, olasBalances] = await Promise.all([
    getEthBalances(walletAddresses),
    getOlasBalances(walletAddresses),
  ]);

  if (!ethBalances) return;
  if (!olasBalances) return;

  const tempWalletBalances: WalletAddressNumberRecord = {};
  for (const [address, balance] of Object.entries(ethBalances)) {
    tempWalletBalances[address as Address] = {
      [Token.ETH]: balance,
      [Token.OLAS]: olasBalances[address as Address],
    };
  }

  return tempWalletBalances;
};
