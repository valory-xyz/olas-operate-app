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
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol } from '@/constants/token';
import {
  useBalanceContext,
  useRewardContext,
  useService,
  useServices,
} from '@/hooks';
import { useAvailableAgentAssets } from '@/hooks/useAvailableAgentAssets';
import { Nullable, ValueOf } from '@/types/Util';
import { AvailableAsset } from '@/types/Wallet';
import { generateName } from '@/utils/agentName';

import { STEPS, TransactionHistory } from './types';

const AgentWalletContext = createContext<{
  walletStep: ValueOf<typeof STEPS>;
  updateStep: (newStep: ValueOf<typeof STEPS>) => void;
  isLoading: boolean;
  walletChainId: Nullable<EvmChainId>;
  transactionHistory: TransactionHistory[];
  agentName: Nullable<string>;
  agentImgSrc: Nullable<string>;
  stakingRewards: { value: number };
  availableAssets: AvailableAsset[];
  amountsToWithdraw: Partial<Record<TokenSymbol, number>>;
}>({
  walletStep: STEPS.AGENT_WALLET_SCREEN,
  updateStep: () => {},
  isLoading: false,
  walletChainId: null,
  transactionHistory: [],
  agentName: null,
  agentImgSrc: null,
  stakingRewards: { value: 0 },
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
  const { isLoading: isBalanceLoading } = useBalanceContext();
  const { availableRewardsForEpochEth, accruedServiceStakingRewards } =
    useRewardContext();
  const availableAssets = useAvailableAgentAssets();

  const { evmHomeChainId: walletChainId } = selectedAgentConfig;

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

  // rewards not yet claimed from staking contract
  const stakingRewards = useMemo(() => {
    const total = sum([
      accruedServiceStakingRewards,
      availableRewardsForEpochEth,
    ]);

    return { value: total };
  }, [accruedServiceStakingRewards, availableRewardsForEpochEth]);

  const updateStep = useCallback(
    (newStep: ValueOf<typeof STEPS>) => {
      setWalletStep(newStep);
    },
    [setWalletStep],
  );

  return (
    <AgentWalletContext.Provider
      value={{
        walletStep,
        updateStep,
        isLoading: isServicesLoading || !isLoaded || isBalanceLoading,
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
    </AgentWalletContext.Provider>
  );
};

export const useAgentWallet = () => {
  const context = useContext(AgentWalletContext);
  if (!context) {
    throw new Error('useAgentWallet must be used within a AgentWalletProvider');
  }
  return context;
};
