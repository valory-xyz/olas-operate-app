import { sum } from 'lodash';
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
import { EvmChainId } from '@/constants/chains';
import {
  useAvailableAgentAssets,
  useBalanceContext,
  usePageState,
  useRewardContext,
  useService,
  useServices,
} from '@/hooks';
import { TokenBalanceRecord } from '@/types';
import { Nullable, Optional, ValueOf } from '@/types/Util';
import { AvailableAsset } from '@/types/Wallet';

import { STEPS, TransactionHistory } from './types';

/**
 * `gas-error`: user entered the Fund Agent flow from an INSUFFICIENT_SIGNER_GAS
 * modal. Native-gas funds must route 100% to the AgentEOA, not the Safe — see
 * `prepareAgentFundsForTransfer` in `ConfirmTransfer.tsx`. Reset to `normal`
 * once consumed (successful fund) or on dismiss.
 */
export type FundEntrySource = 'normal' | 'gas-error';

type AgentWalletNavParams = {
  initialStep?: ValueOf<typeof STEPS>;
  initialFundValues?: TokenBalanceRecord;
  initialFundEntrySource?: FundEntrySource;
};

const AgentWalletContext = createContext<{
  walletStep: ValueOf<typeof STEPS>;
  updateStep: (newStep: ValueOf<typeof STEPS>) => void;
  isLoading: boolean;
  walletChainId: Nullable<EvmChainId>;
  transactionHistory: TransactionHistory[];
  agentName: string;
  agentImgSrc: Nullable<string>;
  stakingRewards: number;
  availableAssets: AvailableAsset[];
  fundInitialValues: Optional<TokenBalanceRecord>;
  setFundInitialValues: (values: TokenBalanceRecord) => void;
  fundEntrySource: FundEntrySource;
  setFundEntrySource: (source: FundEntrySource) => void;
}>({
  walletStep: STEPS.AGENT_WALLET_SCREEN,
  updateStep: () => {},
  isLoading: false,
  walletChainId: null,
  transactionHistory: [],
  agentName: '',
  agentImgSrc: null,
  stakingRewards: 0,
  availableAssets: [],
  fundInitialValues: {},
  setFundInitialValues: () => {},
  fundEntrySource: 'normal',
  setFundEntrySource: () => {},
});

export const AgentWalletProvider = ({ children }: { children: ReactNode }) => {
  const { navParams, clearNavParams } = usePageState();
  const params = navParams as AgentWalletNavParams;

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
    useState<TokenBalanceRecord>(params.initialFundValues ?? {});
  const [fundEntrySource, setFundEntrySource] = useState<FundEntrySource>(
    params.initialFundEntrySource ?? 'normal',
  );

  const { evmHomeChainId: walletChainId } = selectedAgentConfig;

  // wallet chain ID
  const [walletStep, setWalletStep] = useState<ValueOf<typeof STEPS>>(
    params.initialStep ?? STEPS.AGENT_WALLET_SCREEN,
  );

  // Clear navParams after consuming them on mount
  useEffect(() => {
    clearNavParams();
  }, [clearNavParams]);

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
      // Stepping away from FUND_AGENT clears the gas-error source so a
      // subsequent normal entry (e.g. via AgentLowBalanceAlert) doesn't
      // inherit the force-EOA routing.
      if (newStep !== STEPS.FUND_AGENT) {
        setFundEntrySource('normal');
      }
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
        fundEntrySource,
        setFundEntrySource,
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
