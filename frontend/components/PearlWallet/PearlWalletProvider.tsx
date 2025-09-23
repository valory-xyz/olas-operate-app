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
import { TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import { AgentType } from '@/constants/agent';
import { type EvmChainName } from '@/constants/chains';
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import {
  useBalanceContext,
  useMasterBalances,
} from '@/hooks/useBalanceContext';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useUsdAmounts } from '@/hooks/useUsdAmounts';
import { toUsd } from '@/service/toUsd';
import { AgentConfig } from '@/types/Agent';
import { Nullable, ValueOf } from '@/types/Util';
import { generateName } from '@/utils/agentName';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

import {
  AvailableAsset,
  StakedAsset,
  STEPS,
  WalletChain,
} from './Withdraw/types';

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
  const { isLoaded, serviceSafes } = useService(
    selectedService?.service_config_id,
  );
  const { isLoading: isBalanceLoading, totalStakedOlasBalance } =
    useBalanceContext();
  const { accruedServiceStakingRewards } = useRewardContext();
  const {
    masterEoaBalance,
    masterSafeNativeBalance,
    masterSafeOlasBalance,
    masterSafeErc20Balances,
  } = useMasterBalances();

  const { evmHomeChainId, middlewareHomeChainId } = selectedAgentConfig;

  // wallet chain ID
  const [walletStep, setWalletStep] = useState<ValueOf<typeof STEPS>>(
    STEPS.PEARL_WALLET_SCREEN,
  );
  const [walletChainId, setWalletChainId] =
    useState<Nullable<EvmChainId>>(evmHomeChainId);
  const [amountsToWithdraw, setAmountsToWithdraw] = useState<
    Partial<Record<TokenSymbol, number>>
  >({});

  const agent = ACTIVE_AGENTS.find(
    ([, agentConfig]) =>
      agentConfig.middlewareHomeChainId === selectedService?.home_chain,
  );
  const agentType = agent ? agent[0] : null;

  // agent safe
  const serviceSafe = useMemo(
    () => serviceSafes?.find(({ evmChainId }) => evmChainId === walletChainId),
    [serviceSafes, walletChainId],
  );

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

  const chainName = walletChainId
    ? (CHAIN_CONFIG[walletChainId].name as string)
    : '';

  const usdRequirements = useMemo(() => {
    if (!walletChainId) return [];
    return Object.entries(TOKEN_CONFIG[walletChainId!]).map(
      ([untypedSymbol]) => {
        const symbol = untypedSymbol as TokenSymbol;
        return { [symbol]: 0 };
      },
    );
  }, [walletChainId]);

  const { breakdown: usdBreakdown } = useUsdAmounts(chainName, usdRequirements);

  // OLAS token, Native Token, other ERC20 tokens
  const availableAssets: AvailableAsset[] = useMemo(() => {
    if (!walletChainId) return [];

    const tokenConfig = TOKEN_CONFIG[walletChainId];
    return Object.entries(tokenConfig).map(
      ([untypedSymbol, untypedTokenDetails]) => {
        const symbol = untypedSymbol as TokenSymbol;
        const { address } = untypedTokenDetails as TokenConfig;
        const { usdPrice } = usdBreakdown.find(
          (breakdown) => breakdown.symbol === symbol,
        ) ?? { usdPrice: 0 };

        const balance = (() => {
          // balance for OLAS
          if (symbol === TokenSymbolMap.OLAS) {
            return sum([masterSafeOlasBalance, accruedServiceStakingRewards]);
          }

          // balance for native tokens
          if (symbol === asEvmChainDetails(middlewareHomeChainId).symbol) {
            return sum([masterSafeNativeBalance, masterEoaBalance]);
          }

          // balance for other required tokens (eg. USDC)
          return masterSafeErc20Balances?.[symbol] ?? 0;
        })();

        const asset: AvailableAsset = {
          address,
          symbol,
          amount: balance,
          valueInUsd: usdPrice * balance,
        };
        return asset;
      },
    );
  }, [
    walletChainId,
    usdBreakdown,
    middlewareHomeChainId,
    masterSafeErc20Balances,
    masterSafeOlasBalance,
    accruedServiceStakingRewards,
    masterSafeNativeBalance,
    masterEoaBalance,
  ]);

  const aggregatedBalance = useMemo(() => {
    return sum(availableAssets.map(({ valueInUsd }) => valueInUsd));
  }, [availableAssets]);

  // staked OLAS
  const stakedAssets: StakedAsset[] = [
    {
      agentName: generateName(serviceSafe?.address),
      agentImgSrc: agentType ? `/agent-${agentType}-icon.png` : null,
      symbol: 'OLAS',
      amount: totalStakedOlasBalance ?? 0,
      value: toUsd('OLAS', totalStakedOlasBalance ?? 0),
    },
  ];

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

  return (
    <PearlWalletContext.Provider
      value={{
        walletStep,
        updateStep,
        isLoading: isServicesLoading || !isLoaded || isBalanceLoading,
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
