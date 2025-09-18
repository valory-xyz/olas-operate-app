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
import { TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import {
  useBalanceContext,
  useServiceBalances,
} from '@/hooks/useBalanceContext';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { toUsd } from '@/service/toUsd';
import { Nullable, ValueOf } from '@/types/Util';
import { generateName } from '@/utils/agentName';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

import {
  AvailableAsset,
  StakedAsset,
  STEPS,
  TransactionHistory,
} from './Withdraw/types';

const PearlWalletContext = createContext<{
  walletStep: ValueOf<typeof STEPS>;
  updateStep: (newStep: ValueOf<typeof STEPS>) => void;
  isLoading: boolean;
  aggregatedBalance: Nullable<number>;
  walletChainId: Nullable<EvmChainId>;
  transactionHistory: TransactionHistory[];
  availableAssets: AvailableAsset[];
  stakedAssets: StakedAsset[];
  amountsToWithdraw: Partial<Record<TokenSymbol, number>>;
}>({
  walletStep: STEPS.AGENT_WALLET_SCREEN,
  updateStep: () => {},
  isLoading: false,
  aggregatedBalance: null,
  walletChainId: null,
  transactionHistory: [],
  stakedAssets: [],
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
  const { isLoading: isBalanceLoading, totalStakedOlasBalance } =
    useBalanceContext();

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
          valueInUsd: toUsd(symbol, balance),
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
  ]);

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

  return (
    <PearlWalletContext.Provider
      value={{
        walletStep,
        updateStep,
        isLoading: isServicesLoading || !isLoaded || isBalanceLoading,
        aggregatedBalance: null,
        walletChainId,
        transactionHistory: [],

        availableAssets,
        stakedAssets,
        amountsToWithdraw: {},
      }}
    >
      {children}
    </PearlWalletContext.Provider>
  );
};

export const usePearlWallet = () => {
  const context = useContext(PearlWalletContext);
  if (!context) {
    throw new Error('usePearlWallet must be used within a AgentWalletProvider');
  }
  return context;
};
