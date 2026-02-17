import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ACTIVE_AGENTS } from '@/config/agents';
import { CHAIN_CONFIG } from '@/config/chains';
import { TokenSymbol } from '@/config/tokens';
import { EvmChainId, type EvmChainName, MasterSafe, PAGES } from '@/constants';
import {
  useAvailableAssets,
  useBalanceAndRefillRequirementsContext,
  useBalanceContext,
  useMasterWalletContext,
  usePageState,
  useService,
  useServices,
} from '@/hooks';
import {
  Address,
  AvailableAsset,
  MiddlewareServiceResponse,
  Nullable,
  Optional,
  StakedAsset,
  TokenAmountDetails,
  TokenAmounts,
  TokenBalanceRecord,
  ValueOf,
} from '@/types';
import { generateAgentName, isValidServiceId } from '@/utils';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

import { STEPS, WalletChain } from '../components/PearlWallet/types';
import { getInitialDepositForMasterSafe } from '../components/PearlWallet/utils';

const getMasterSafeAddress = (
  chainId: EvmChainId,
  masterSafes?: MasterSafe[],
) => masterSafes?.find((safe) => safe.evmChainId === chainId)?.address ?? null;

/**
 * Get the unique list of chains from the middleware services.
 */
const getChainList = (services?: MiddlewareServiceResponse[]) => {
  if (!services) return [];
  const chainMap = new Map<
    EvmChainId,
    { chainId: EvmChainId; chainName: EvmChainName }
  >();

  services.forEach((service) => {
    const agent = ACTIVE_AGENTS.find(
      ([, agentConfig]) =>
        agentConfig.servicePublicId === service.service_public_id &&
        agentConfig.middlewareHomeChainId === service.home_chain,
    );
    if (!agent) return;

    const [, agentConfig] = agent;
    if (!agentConfig.evmHomeChainId) return;

    const chainId = agentConfig.evmHomeChainId;
    if (!chainMap.has(chainId)) {
      const chainName = CHAIN_CONFIG[chainId].name as EvmChainName;
      chainMap.set(chainId, { chainId, chainName });
    }
  });

  return Array.from(chainMap.values());
};

const PearlWalletContext = createContext<{
  walletStep: ValueOf<typeof STEPS>;
  updateStep: (newStep: ValueOf<typeof STEPS>) => void;
  gotoPearlWallet: () => void;
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
  onAmountChange: (symbol: TokenSymbol, details: TokenAmountDetails) => void;
  amountsToDeposit: TokenAmounts;
  onDepositAmountChange: (
    symbol: TokenSymbol,
    details: TokenAmountDetails,
  ) => void;
  updateAmountsToDeposit: (amounts: TokenAmounts) => void;
  onReset: (canNavigateOnReset?: boolean) => void;
  /** Initial values for funding agent wallet based on refill requirements */
  defaultRequirementDepositValues: Optional<TokenBalanceRecord>;
}>({
  walletStep: STEPS.PEARL_WALLET_SCREEN,
  updateStep: () => {},
  gotoPearlWallet: () => {},
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
  updateAmountsToDeposit: () => {},
  onReset: () => {},
  defaultRequirementDepositValues: {},
});

export const PearlWalletProvider = ({ children }: { children: ReactNode }) => {
  const {
    isLoading: isServicesLoading,
    selectedAgentConfig,
    selectedService,
    services,
    availableServiceConfigIds,
    getServiceConfigIdsOf,
  } = useServices();
  const { isLoaded, getServiceSafeOf, getAgentTypeOf } = useService(
    selectedService?.service_config_id,
  );
  const { isLoading: isBalanceLoading, getStakedOlasBalanceOf } =
    useBalanceContext();
  const { getRefillRequirementsOf } = useBalanceAndRefillRequirementsContext();
  const { masterSafes } = useMasterWalletContext();
  const { pageState, goto } = usePageState();

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

  const getServiceTokenId = useCallback(
    (chainId: EvmChainId, configId: string) => {
      const chainName = asMiddlewareChain(chainId);
      const service = services?.find(
        (entry) =>
          entry.service_config_id === configId &&
          entry.home_chain === chainName,
      );

      const tokenId = service?.chain_configs?.[chainName]?.chain_data?.token;
      return tokenId;
    },
    [services],
  );

  // Update chain id when switching between agents
  useEffect(() => {
    setWalletChainId(selectedAgentConfig.evmHomeChainId);
  }, [selectedAgentConfig.evmHomeChainId]);

  const { isLoading: isAvailableAssetsLoading, availableAssets } =
    useAvailableAssets(walletChainId, {
      // For deposit, we only want to show assets in the safe.
      includeMasterEoa:
        walletStep !== STEPS.DEPOSIT ||
        pageState !== PAGES.DepositOlasForStaking,
    });
  const masterSafeAddress = useMemo(
    () => getMasterSafeAddress(walletChainId, masterSafes),
    [masterSafes, walletChainId],
  );

  // Set initial deposit amounts if refill requirements is requested
  useEffect(() => {
    if (!masterSafeAddress) return;

    const defaultRequirementDepositValues = getInitialDepositForMasterSafe(
      walletChainId,
      masterSafeAddress,
      getServiceConfigIdsOf(walletChainId),
      getRefillRequirementsOf,
    );

    if (!defaultRequirementDepositValues) return;

    setDefaultDepositValues(defaultRequirementDepositValues);
    setAmountsToDeposit(defaultRequirementDepositValues);
  }, [
    getRefillRequirementsOf,
    walletChainId,
    masterSafeAddress,
    getServiceConfigIdsOf,
  ]);

  // list of unique chains where the user has services
  const chains = useMemo(() => getChainList(services), [services]);

  // staked OLAS
  const stakedAssets: StakedAsset[] = useMemo(() => {
    const configIds = availableServiceConfigIds.filter(
      ({ chainId }) => chainId === walletChainId,
    );

    return configIds.map(({ configId, chainId }) => {
      const agentSafe = getServiceSafeOf?.(walletChainId, configId)?.address;
      const tokenId = getServiceTokenId(chainId, configId);
      const agentName = isValidServiceId(tokenId)
        ? generateAgentName(chainId, tokenId)
        : `My ${selectedAgentConfig.displayName}`;
      const agentType = getAgentTypeOf(walletChainId, configId);

      return {
        chainId,
        configId,
        agentName,
        agentImgSrc: agentType ? `/agent-${agentType}-icon.png` : null,
        symbol: 'OLAS',
        amount: getStakedOlasBalanceOf(agentSafe!) ?? 0,
      };
    });
  }, [
    availableServiceConfigIds,
    walletChainId,
    getServiceSafeOf,
    getAgentTypeOf,
    getServiceTokenId,
    getStakedOlasBalanceOf,
    selectedAgentConfig.displayName,
  ]);

  const updateStep = useCallback(
    (newStep: ValueOf<typeof STEPS>) => {
      setWalletStep(newStep);
    },
    [setWalletStep],
  );

  const onAmountChange = useCallback(
    (symbol: TokenSymbol, details: TokenAmountDetails) => {
      setAmountsToWithdraw((prev) => ({ ...prev, [symbol]: details }));
    },
    [],
  );

  const onDepositAmountChange = useCallback(
    (symbol: TokenSymbol, details: TokenAmountDetails) => {
      setAmountsToDeposit((prev) => ({ ...prev, [symbol]: details }));
    },
    [],
  );

  const updateAmountsToDeposit = useCallback(
    (amounts: TokenAmounts) => {
      setAmountsToDeposit(amounts);
    },
    [setAmountsToDeposit],
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
      onReset(options?.canNavigateOnReset);
      setWalletChainId(chainId);
    },
    [onReset],
  );

  const gotoPearlWallet = useCallback(() => {
    goto(PAGES.PearlWallet);
    updateStep(STEPS.PEARL_WALLET_SCREEN);
  }, [updateStep, goto]);

  const isLoading =
    isServicesLoading ||
    !isLoaded ||
    isBalanceLoading ||
    isAvailableAssetsLoading;

  return (
    <PearlWalletContext.Provider
      value={{
        walletStep,
        updateStep,
        gotoPearlWallet,

        isLoading,
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
        updateAmountsToDeposit,
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
