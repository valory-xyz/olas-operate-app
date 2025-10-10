import { compact } from 'lodash';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { MiddlewareServiceResponse, TokenBalanceRecord } from '@/client';
import { ACTIVE_AGENTS } from '@/config/agents';
import { CHAIN_CONFIG } from '@/config/chains';
import {
  AgentType,
  EvmChainId,
  type EvmChainName,
  TokenSymbol,
} from '@/constants';
import { MasterSafe } from '@/enums';
import {
  useBalanceAndRefillRequirementsContext,
  useBalanceContext,
  useMasterWalletContext,
  useService,
  useServices,
} from '@/hooks';
import { useAvailableAssets } from '@/hooks/useAvailableAssets';
import { Address } from '@/types/Address';
import { AgentConfig } from '@/types/Agent';
import { Nullable, Optional, ValueOf } from '@/types/Util';
import { AvailableAsset, StakedAsset, TokenAmounts } from '@/types/Wallet';
import { generateName } from '@/utils';

import { STEPS, WalletChain } from './types';
import { getInitialDepositForMasterSafe } from './utils';

const getMasterSafeAddress = (
  chainId: EvmChainId,
  masterSafes?: MasterSafe[],
) => masterSafes?.find((safe) => safe.evmChainId === chainId)?.address ?? null;

const getChainList = (services?: MiddlewareServiceResponse[]) => {
  if (!services) return [];
  return compact(
    services.map((service) => {
      const agent = ACTIVE_AGENTS.find(
        ([, agentConfig]) =>
          agentConfig.middlewareHomeChainId === service.home_chain,
      );
      if (!agent) return null;

      const [, agentConfig] = agent as [AgentType, AgentConfig];
      if (!agentConfig.evmHomeChainId) return null;

      const chainId = agentConfig.evmHomeChainId;
      const chainName = CHAIN_CONFIG[chainId].name as EvmChainName;
      return { chainId, chainName };
    }),
  );
};

const PearlWalletContext = createContext<{
  walletStep: ValueOf<typeof STEPS>;
  updateStep: (newStep: ValueOf<typeof STEPS>) => void;
  isLoading: boolean;
  chains: WalletChain[];
  masterSafeAddress: Nullable<Address>;
  walletChainId: Nullable<EvmChainId>;
  onWalletChainChange: (
    chainId: EvmChainId,
    options?: { canNavigateOnReset?: boolean },
  ) => void;
  availableAssets: AvailableAsset[];
  stakedAssets: StakedAsset[];
  amountsToWithdraw: TokenAmounts;
  onAmountChange: (symbol: TokenSymbol, amount: number) => void;
  amountsToDeposit: TokenAmounts;
  onDepositAmountChange: (symbol: TokenSymbol, amount: number) => void;
  onReset: () => void;
  /** Initial values for funding agent wallet based on refill requirements */
  defaultRequirementDepositValues: Optional<TokenBalanceRecord>;
}>({
  walletStep: STEPS.PEARL_WALLET_SCREEN,
  updateStep: () => {},
  isLoading: false,
  walletChainId: null,
  masterSafeAddress: null,
  onWalletChainChange: () => {},
  chains: [],
  stakedAssets: [],
  availableAssets: [],
  amountsToWithdraw: {},
  onAmountChange: () => {},
  amountsToDeposit: {},
  onDepositAmountChange: () => {},
  onReset: () => {},
  defaultRequirementDepositValues: {},
});

export const PearlWalletProvider = ({ children }: { children: ReactNode }) => {
  const {
    isLoading: isServicesLoading,
    selectedAgentConfig,
    selectedService,
    services,
  } = useServices();
  const { isLoaded, getServiceSafeOf } = useService(
    selectedService?.service_config_id,
  );
  const { isLoading: isBalanceLoading, getTotalStakedOlasBalanceOf } =
    useBalanceContext();
  const { getRefillRequirementsOf } = useBalanceAndRefillRequirementsContext();
  const { masterSafes } = useMasterWalletContext();

  const [walletStep, setWalletStep] = useState<ValueOf<typeof STEPS>>(
    STEPS.PEARL_WALLET_SCREEN,
  );
  const [walletChainId, setWalletChainId] = useState<EvmChainId>(
    selectedAgentConfig.evmHomeChainId,
  );
  const [amountsToWithdraw, setAmountsToWithdraw] = useState<TokenAmounts>({});
  const [amountsToDeposit, setAmountsToDeposit] = useState<TokenAmounts>({});
  const [defaultRequirementDepositValues, setDefaultDepositValues] =
    useState<TokenBalanceRecord>({});

  const { isLoading: isAvailableAssetsLoading, availableAssets } =
    useAvailableAssets(walletChainId);
  const masterSafeAddress = useMemo(
    () => getMasterSafeAddress(walletChainId, masterSafes),
    [masterSafes, walletChainId],
  );

  // Set initial deposit amounts if refill requirements is requested
  useEffect(() => {
    if (!masterSafeAddress) return;
    if (!getRefillRequirementsOf) return;

    const defaultRequirementDepositValues = getInitialDepositForMasterSafe(
      walletChainId,
      masterSafeAddress,
      getRefillRequirementsOf,
    );

    if (!defaultRequirementDepositValues) return;

    setDefaultDepositValues(defaultRequirementDepositValues);
    setAmountsToDeposit(defaultRequirementDepositValues);
  }, [getRefillRequirementsOf, walletChainId, masterSafeAddress]);

  const agent = ACTIVE_AGENTS.find(
    ([, agentConfig]) => agentConfig.evmHomeChainId === walletChainId,
  );
  const agentType = agent ? agent[0] : null;

  // list of chains where the user has services
  const chains = useMemo(() => getChainList(services), [services]);

  // staked OLAS
  const stakedAssets: StakedAsset[] = useMemo(
    () => [
      {
        agentName: walletChainId
          ? generateName(getServiceSafeOf(walletChainId)?.address)
          : 'Agent',
        agentImgSrc: agentType ? `/agent-${agentType}-icon.png` : null,
        symbol: 'OLAS',
        amount: getTotalStakedOlasBalanceOf(walletChainId) ?? 0,
      },
    ],
    [walletChainId, agentType, getTotalStakedOlasBalanceOf, getServiceSafeOf],
  );

  const updateStep = useCallback(
    (newStep: ValueOf<typeof STEPS>) => {
      setWalletStep(newStep);
    },
    [setWalletStep],
  );

  const onAmountChange = useCallback((symbol: TokenSymbol, amount: number) => {
    setAmountsToWithdraw((prev) => ({ ...prev, [symbol]: amount }));
  }, []);

  const onDepositAmountChange = useCallback(
    (symbol: TokenSymbol, amount: number) => {
      setAmountsToDeposit((prev) => ({ ...prev, [symbol]: amount }));
    },
    [],
  );

  const onReset = useCallback((canNavigateOnReset?: boolean) => {
    setAmountsToWithdraw({});
    setAmountsToDeposit({});
    setDefaultDepositValues({});

    if (canNavigateOnReset) {
      setWalletStep(STEPS.PEARL_WALLET_SCREEN);
    }
  }, []);

  const onWalletChainChange = useCallback(
    (chainId: EvmChainId, options?: { canNavigateOnReset?: boolean }) => {
      setWalletChainId(chainId);
      onReset(options?.canNavigateOnReset);
    },
    [onReset],
  );

  const isLoading =
    isServicesLoading ||
    !isLoaded ||
    isBalanceLoading ||
    isAvailableAssetsLoading;

  return (
    <PearlWalletContext.Provider
      value={{
        isLoading,
        walletStep,
        updateStep,
        availableAssets,
        stakedAssets,
        masterSafeAddress,

        // for chain
        walletChainId,
        onWalletChainChange,
        chains,

        // for withdraw
        amountsToWithdraw,
        onAmountChange,

        // for deposit
        amountsToDeposit,
        onDepositAmountChange,
        onReset,

        // Initial values for funding agent wallet
        defaultRequirementDepositValues,
      }}
    >
      {children}
    </PearlWalletContext.Provider>
  );
};

export const usePearlWallet = () => {
  const context = useContext(PearlWalletContext);
  if (!context) {
    throw new Error('usePearlWallet must be used within a PearlWalletProvider');
  }
  return context;
};
