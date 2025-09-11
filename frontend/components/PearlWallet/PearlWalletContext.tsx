import { sum } from 'lodash';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { ACTIVE_AGENTS } from '@/config/agents';
import { TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import {
  useBalanceContext,
  useMasterBalances,
} from '@/hooks/useBalanceContext';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { toUsd } from '@/service/toUsd';
import { Nullable } from '@/types/Util';
import { generateName } from '@/utils/agentName';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

import { AvailableAsset, StakedAsset } from './Withdraw/types';

const PearlWalletContext = createContext<{
  isLoading: boolean;
  aggregatedBalance: Nullable<number>;
  walletChainId: Nullable<EvmChainId>;
  availableAssets: AvailableAsset[];
  stakedAssets: StakedAsset[];
  amountsToWithdraw: Partial<Record<TokenSymbol, number>>;
  onAmountChange: (symbol: TokenSymbol, amount: number) => void;
}>({
  isLoading: false,
  aggregatedBalance: null,
  walletChainId: null,
  stakedAssets: [],
  availableAssets: [],
  amountsToWithdraw: {},
  onAmountChange: () => {},
});

export const PearlWalletProvider = ({ children }: { children: ReactNode }) => {
  const {
    isLoading: isServicesLoading,
    selectedAgentConfig,
    selectedService,
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

  // wallet chain ID
  const [walletChainId, setWalletChainId] = useState<Nullable<EvmChainId>>(
    selectedAgentConfig.evmHomeChainId,
  );
  const [amountsToWithdraw, setAmountsToWithdraw] = useState<
    Partial<Record<TokenSymbol, number>>
  >({});

  console.log('amountsToWithdraw', amountsToWithdraw);

  const { evmHomeChainId, middlewareHomeChainId } = selectedAgentConfig;
  const agent = ACTIVE_AGENTS.find(
    ([, agentConfig]) =>
      agentConfig.middlewareHomeChainId === selectedService?.home_chain,
  );
  const agentType = agent ? agent[0] : null;

  // agent safe
  const serviceSafe = useMemo(
    () => serviceSafes?.find(({ evmChainId }) => evmChainId === evmHomeChainId),
    [serviceSafes, evmHomeChainId],
  );

  // OLAS token, Native Token, other ERC20 tokens
  const availableAssets: AvailableAsset[] = useMemo(() => {
    const tokenConfig = TOKEN_CONFIG[selectedAgentConfig.evmHomeChainId];

    return Object.entries(tokenConfig).map(
      ([untypedSymbol, untypedTokenDetails]) => {
        const symbol = untypedSymbol as TokenSymbol;
        const { address } = untypedTokenDetails as TokenConfig;

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
          valueInUsd: toUsd(symbol, balance),
        };
        return asset;
      },
    );
  }, [
    selectedAgentConfig,
    masterSafeOlasBalance,
    accruedServiceStakingRewards,
    middlewareHomeChainId,
    masterSafeNativeBalance,
    masterEoaBalance,
    masterSafeErc20Balances,
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

  const onAmountChange = (symbol: TokenSymbol, amount: number) => {
    setAmountsToWithdraw((prev) => ({ ...prev, [symbol]: amount }));
  };

  return (
    <PearlWalletContext.Provider
      value={{
        isLoading: isServicesLoading || !isLoaded || isBalanceLoading,
        aggregatedBalance: null,
        walletChainId: evmHomeChainId,
        availableAssets,
        stakedAssets,
        amountsToWithdraw,
        onAmountChange,
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
