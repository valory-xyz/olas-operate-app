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
import {
  useAvailableAgentAssets,
  useBalanceContext,
  useRewardContext,
  useService,
  useServices,
} from '@/hooks';
import { TokenBalanceRecord } from '@/types';
import { Nullable, Optional, ValueOf } from '@/types/Util';
import { AvailableAsset } from '@/types/Wallet';

import { STEPS, TransactionHistory } from './types';

const AgentWalletContext = createContext<{
  walletStep: ValueOf<typeof STEPS>;
  updateStep: (newStep: ValueOf<typeof STEPS>) => void;
  isLoading: boolean;
  walletChainId: Nullable<EvmChainId>;
  transactionHistory: TransactionHistory[];
  agentName: Nullable<string>;
  agentImgSrc: Nullable<string>;
  stakingRewards: number;
  availableAssets: AvailableAsset[];
  fundInitialValues: Optional<TokenBalanceRecord>;
  setFundInitialValues: (values: TokenBalanceRecord) => void;
}>({
  walletStep: STEPS.AGENT_WALLET_SCREEN,
  updateStep: () => {},
  isLoading: false,
  walletChainId: null,
  transactionHistory: [],
  agentName: null,
  agentImgSrc: null,
  stakingRewards: 0,
  availableAssets: [],
  fundInitialValues: {},
  setFundInitialValues: () => {},
});

export const AgentWalletProvider = ({ children }: { children: ReactNode }) => {
  const {
    isLoading: isServicesLoading,
    selectedAgentConfig,
    selectedService,
    selectedAgentNameOrFallback,
  } = useServices();
  const { isLoaded } = useService(selectedService?.service_config_id);
  const { isLoading: isBalanceLoading } = useBalanceContext();
  const { availableRewardsForEpochEth, accruedServiceStakingRewards } =
    useRewardContext();
  const { availableAssets } = useAvailableAgentAssets();
  const [fundInitialValues, setFundInitialValues] =
    useState<TokenBalanceRecord>({});

  const { evmHomeChainId: walletChainId } = selectedAgentConfig;

  // wallet chain ID
  const [walletStep, setWalletStep] = useState<ValueOf<typeof STEPS>>(
    STEPS.AGENT_WALLET_SCREEN,
  );

  const agent = ACTIVE_AGENTS.find(
    ([, agentConfig]) =>
      agentConfig.servicePublicId === selectedService?.service_public_id &&
      agentConfig.middlewareHomeChainId === selectedService?.home_chain,
  );
  const agentType = agent ? agent[0] : null;

  // rewards not yet claimed from staking contract
  const stakingRewards = useMemo(() => {
    const total = sum([
      accruedServiceStakingRewards,
      availableRewardsForEpochEth,
    ]);

    return total;
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
        agentName: selectedAgentNameOrFallback,
        agentImgSrc: agentType ? `/agent-${agentType}-icon.png` : null,
        stakingRewards,
        availableAssets,

        // Initial values for funding agent wallet
        fundInitialValues,
        setFundInitialValues,
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
