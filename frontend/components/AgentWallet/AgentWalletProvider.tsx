import { sum } from 'lodash';
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
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import {
  useBalanceContext,
  useRewardContext,
  useService,
  useServiceBalances,
  useServices,
  useUsdAmounts,
} from '@/hooks';
import { Nullable, ValueOf } from '@/types/Util';
import { generateName } from '@/utils/agentName';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

import { AvailableAsset, STEPS, TransactionHistory } from './types';

const PearlWalletContext = createContext<{
  walletStep: ValueOf<typeof STEPS>;
  updateStep: (newStep: ValueOf<typeof STEPS>) => void;
  isLoading: boolean;
  aggregatedBalance: Nullable<number>;
  walletChainId: Nullable<EvmChainId>;
  transactionHistory: TransactionHistory[];
  agentName: Nullable<string>;
  agentImgSrc: Nullable<string>;
  stakingRewards: { value: number; valueInUsd: number };
  availableAssets: AvailableAsset[];
  amountsToWithdraw: Partial<Record<TokenSymbol, number>>;
}>({
  walletStep: STEPS.AGENT_WALLET_SCREEN,
  updateStep: () => {},
  isLoading: false,
  aggregatedBalance: null,
  walletChainId: null,
  transactionHistory: [],
  agentName: null,
  agentImgSrc: null,
  stakingRewards: { value: 0, valueInUsd: 0 },
  availableAssets: [],
  amountsToWithdraw: {},
});

export const AgentWalletProvider = ({ children }: { children: ReactNode }) => {
  const {
    isLoading: isServicesLoading,
    selectedAgentConfig,
    selectedService,
  } = useServices();
  const { isLoaded, serviceSafes } = useService(
    selectedService?.service_config_id,
  );
  const {
    serviceSafeErc20Balances,
    serviceEoaNativeBalance,
    serviceSafeNativeBalances,
    serviceSafeOlas,
  } = useServiceBalances(selectedService?.service_config_id);
  const { isLoading: isBalanceLoading } = useBalanceContext();
  const { availableRewardsForEpochEth, accruedServiceStakingRewards } =
    useRewardContext();

  const { evmHomeChainId: walletChainId, middlewareHomeChainId } =
    selectedAgentConfig;

  // wallet chain ID
  const [walletStep, setWalletStep] = useState<ValueOf<typeof STEPS>>(
    STEPS.AGENT_WALLET_SCREEN,
  );

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

  const chainName = walletChainId
    ? (CHAIN_CONFIG[walletChainId].name as string)
    : '';

  const usdRequirements = useMemo(() => {
    if (!walletChainId) return [];
    return Object.entries(TOKEN_CONFIG[walletChainId!]).map(
      ([untypedSymbol]) => {
        const symbol = untypedSymbol as TokenSymbol;
        return { symbol, amount: 0 };
      },
    );
  }, [walletChainId]);

  const { breakdown: usdBreakdown } = useUsdAmounts(chainName, usdRequirements);

  // TODO: create a separate hook and reuse it in FundAgent and PearlWalletProvider
  // OLAS token, Native Token, other ERC20 tokens
  const availableAssets: AvailableAsset[] = useMemo(() => {
    if (!walletChainId) return [];

    const tokenConfig = TOKEN_CONFIG[walletChainId];
    const serviceSafeBalances = serviceSafeErc20Balances?.reduce<{
      [tokenSymbol: string]: number;
    }>((acc, { balance, symbol }) => {
      if (!acc[symbol]) acc[symbol] = 0;
      acc[symbol] += balance;
      return acc;
    }, {});

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
            return sum([serviceSafeOlas?.balance]);
          }

          // balance for native tokens
          if (symbol === asEvmChainDetails(middlewareHomeChainId).symbol) {
            const serviceSafeNativeBalance = serviceSafeNativeBalances?.find(
              (nativeBalance) => nativeBalance.symbol === symbol,
            )?.balance;
            return sum([
              serviceSafeNativeBalance,
              serviceEoaNativeBalance?.balance,
            ]);
          }

          // balance for other required tokens (eg. USDC)
          return serviceSafeBalances?.[symbol] ?? 0;
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
    middlewareHomeChainId,
    serviceSafeNativeBalances,
    serviceEoaNativeBalance,
    serviceSafeErc20Balances,
    serviceSafeOlas?.balance,
    usdBreakdown,
  ]);

  // rewards not yet claimed from staking contract
  const stakingRewards = useMemo(() => {
    const total = sum([
      accruedServiceStakingRewards,
      availableRewardsForEpochEth,
    ]);
    const usdPrice = usdBreakdown.find(
      ({ symbol }) => symbol === TokenSymbolMap.OLAS,
    )?.usdPrice;

    return { value: total, valueInUsd: usdPrice ? usdPrice * total : 0 };
  }, [accruedServiceStakingRewards, availableRewardsForEpochEth, usdBreakdown]);

  const updateStep = useCallback(
    (newStep: ValueOf<typeof STEPS>) => {
      setWalletStep(newStep);
    },
    [setWalletStep],
  );

  const aggregatedBalance = useMemo(() => {
    return sum(availableAssets.map(({ valueInUsd }) => valueInUsd));
  }, [availableAssets]);

  return (
    <PearlWalletContext.Provider
      value={{
        walletStep,
        updateStep,
        isLoading: isServicesLoading || !isLoaded || isBalanceLoading,
        aggregatedBalance,
        walletChainId,
        transactionHistory: [],
        agentName: generateName(serviceSafe?.address),
        agentImgSrc: agentType ? `/agent-${agentType}-icon.png` : null,
        stakingRewards,
        availableAssets,

        // TODO: withdraw ticket
        amountsToWithdraw: {},
      }}
    >
      {children}
    </PearlWalletContext.Provider>
  );
};

export const useAgentWallet = () => {
  const context = useContext(PearlWalletContext);
  if (!context) {
    throw new Error('useAgentWallet must be used within a AgentWalletProvider');
  }
  return context;
};
