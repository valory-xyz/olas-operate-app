import { compact, sum } from 'lodash';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { ACTIVE_AGENTS } from '@/config/agents';
import { CHAIN_CONFIG } from '@/config/chains';
import { AgentType } from '@/constants/agent';
import { type EvmChainName } from '@/constants/chains';
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol } from '@/constants/token';
import { useBalanceContext, useService, useServices } from '@/hooks';
import { useAvailableAssets } from '@/hooks/useAvailableAssets';
import { AgentConfig } from '@/types/Agent';
import { Nullable, ValueOf } from '@/types/Util';
import { AvailableAsset, StakedAsset } from '@/types/Wallet';
import { generateName } from '@/utils/agentName';

import { STEPS, WalletChain } from './Withdraw/types';

const PearlWalletContext = createContext<{
  walletStep: ValueOf<typeof STEPS>;
  updateStep: (newStep: ValueOf<typeof STEPS>) => void;
  isLoading: boolean;
  aggregatedBalance: Nullable<number>;
  chains: WalletChain[];
  walletChainId: Nullable<EvmChainId>;
  onWalletChainChange?: (chainId: EvmChainId) => void;
  availableAssets: AvailableAsset[];
  stakedAssets: StakedAsset[];
  amountsToWithdraw: Partial<Record<TokenSymbol, number>>;
  onAmountChange: (symbol: TokenSymbol, amount: number) => void;
  onReset: () => void;
}>({
  walletStep: STEPS.PEARL_WALLET_SCREEN,
  updateStep: () => {},
  isLoading: false,
  aggregatedBalance: null,
  walletChainId: null,
  onWalletChainChange: () => {},
  chains: [],
  stakedAssets: [],
  availableAssets: [],
  amountsToWithdraw: {},
  onAmountChange: () => {},
  onReset: () => {},
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

  const [walletStep, setWalletStep] = useState<ValueOf<typeof STEPS>>(
    STEPS.PEARL_WALLET_SCREEN,
  );
  const [walletChainId, setWalletChainId] = useState<EvmChainId>(
    selectedAgentConfig.evmHomeChainId,
  );
  const [amountsToWithdraw, setAmountsToWithdraw] = useState<
    Partial<Record<TokenSymbol, number>>
  >({});
  const { isLoading: isAvailableAssetsLoading, availableAssets } =
    useAvailableAssets(walletChainId);

  const agent = ACTIVE_AGENTS.find(
    ([, agentConfig]) => agentConfig.evmHomeChainId === walletChainId,
  );
  const agentType = agent ? agent[0] : null;

  // list of chains where the user has services
  const chains = useMemo(() => {
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
  }, [services]);

  const aggregatedBalance = useMemo(() => {
    return sum(availableAssets.map(({ valueInUsd }) => valueInUsd));
  }, [availableAssets]);

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

  const onReset = useCallback(() => {
    setWalletStep(STEPS.PEARL_WALLET_SCREEN);
    setAmountsToWithdraw({});
  }, []);

  const onWalletChainChange = useCallback(
    (chainId: EvmChainId) => {
      setWalletChainId(chainId);
      onReset();
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
        walletStep,
        updateStep,
        isLoading,
        aggregatedBalance,
        walletChainId,
        onWalletChainChange,
        chains,
        availableAssets,
        stakedAssets,
        amountsToWithdraw,
        onAmountChange,
        onReset,
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
