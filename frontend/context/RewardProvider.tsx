import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'ethers/lib/utils';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { GNOSIS_CHAIN_CONFIG } from '@/config/chains';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useStore } from '@/hooks/useStore';
import { StakingRewardsInfo } from '@/types/Autonolas';

import { OnlineStatusContext } from './OnlineStatusProvider';
import { StakingProgramContext } from './StakingProgramProvider';

export const RewardContext = createContext<{
  accruedServiceStakingRewards?: number;
  availableRewardsForEpoch?: number;
  availableRewardsForEpochEth?: number;
  isEligibleForRewards?: boolean;
  optimisticRewardsEarnedForEpoch?: number;
  minimumStakedAmountRequired?: number;
  updateRewards: () => Promise<void>;
}>({
  accruedServiceStakingRewards: undefined,
  availableRewardsForEpoch: undefined,
  availableRewardsForEpochEth: undefined,
  isEligibleForRewards: undefined,
  optimisticRewardsEarnedForEpoch: undefined,
  minimumStakedAmountRequired: undefined,
  updateRewards: async () => {},
});

const currentAgent = AGENT_CONFIG.trader; // TODO: replace with dynamic agent selection
const currentChainId = GNOSIS_CHAIN_CONFIG.chainId; // TODO: replace with dynamic chain selection

/**
 * hook to fetch staking rewards details
 */
const useStakingRewardsDetails = () => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { activeStakingProgramId } = useContext(StakingProgramContext);

  const { selectedService, isLoaded } = useServices();
  const serviceConfigId =
    isLoaded && selectedService ? selectedService?.service_config_id : '';
  const { service } = useService({ serviceConfigId });

  // fetch chain data from the selected service
  const chainData = service?.chain_configs[currentChainId].chain_data;
  const multisig = chainData?.multisig;
  const token = chainData?.token;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.REWARDS_KEY(
      currentChainId,
      serviceConfigId,
      activeStakingProgramId!,
      multisig!,
      token!,
    ),
    queryFn: async (): Promise<StakingRewardsInfo | undefined> => {
      return await currentAgent.serviceApi.getAgentStakingRewardsInfo({
        agentMultisigAddress: multisig!,
        serviceId: token!,
        stakingProgramId: activeStakingProgramId!,
        chainId: currentChainId,
      });
    },
    enabled: !!isOnline && !!activeStakingProgramId && !!multisig && !!token,
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });
};

/**
 * hook to fetch available rewards for the current epoch
 */
const useAvailableRewardsForEpoch = () => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { activeStakingProgramId, defaultStakingProgramId } = useContext(
    StakingProgramContext,
  );
  const { selectedService, isLoaded } = useServices();
  const serviceConfigId =
    isLoaded && selectedService ? selectedService?.service_config_id : '';

  return useQuery({
    queryKey: REACT_QUERY_KEYS.AVAILABLE_REWARDS_FOR_EPOCH_KEY(
      currentChainId,
      serviceConfigId,
      activeStakingProgramId!,
      currentChainId,
    ),
    queryFn: async () => {
      return await currentAgent.serviceApi.getAvailableRewardsForEpoch(
        activeStakingProgramId ?? defaultStakingProgramId,
        currentChainId,
      );
    },
    enabled:
      !!isOnline && !!activeStakingProgramId && !!defaultStakingProgramId,
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });
};

/**
 * Provider to manage rewards context
 */
export const RewardProvider = ({ children }: PropsWithChildren) => {
  const { storeState } = useStore();
  const electronApi = useElectronApi();

  // fetch staking rewards details
  const { data: stakingRewardsDetails, refetch: refetchStakingRewardsDetails } =
    useStakingRewardsDetails();

  // fetch available rewards for the current epoch
  const {
    data: availableRewardsForEpoch,
    refetch: refetchAvailableRewardsForEpoch,
  } = useAvailableRewardsForEpoch();

  const isEligibleForRewards = stakingRewardsDetails?.isEligibleForRewards;
  const accruedServiceStakingRewards =
    stakingRewardsDetails?.accruedServiceStakingRewards;

  // available rewards for the current epoch in ETH
  const availableRewardsForEpochEth = useMemo<number | undefined>(() => {
    if (!availableRewardsForEpoch) return;
    return parseFloat(formatUnits(`${availableRewardsForEpoch}`));
  }, [availableRewardsForEpoch]);

  // optimistic rewards earned for the current epoch in ETH
  const optimisticRewardsEarnedForEpoch = useMemo<number | undefined>(() => {
    if (!isEligibleForRewards) return;
    if (!availableRewardsForEpochEth) return;
    return availableRewardsForEpochEth;
  }, [availableRewardsForEpochEth, isEligibleForRewards]);

  // store the first staking reward achieved in the store
  useEffect(() => {
    if (isEligibleForRewards && !storeState?.firstStakingRewardAchieved) {
      electronApi.store?.set?.('firstStakingRewardAchieved', true);
    }
  }, [
    electronApi.store,
    isEligibleForRewards,
    storeState?.firstStakingRewardAchieved,
  ]);

  const updateRewards = useCallback(async () => {
    await refetchStakingRewardsDetails();
    await refetchAvailableRewardsForEpoch();
  }, [refetchStakingRewardsDetails, refetchAvailableRewardsForEpoch]);

  return (
    <RewardContext.Provider
      value={{
        accruedServiceStakingRewards,
        availableRewardsForEpoch,
        availableRewardsForEpochEth,
        isEligibleForRewards,
        optimisticRewardsEarnedForEpoch,
        updateRewards,
      }}
    >
      {children}
    </RewardContext.Provider>
  );
};
