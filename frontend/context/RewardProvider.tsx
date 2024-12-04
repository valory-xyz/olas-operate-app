import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'ethers/lib/utils';
import { isNil } from 'lodash';
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
import { useServices } from '@/hooks/useServices';
import { useStore } from '@/hooks/useStore';
import { StakingRewardsInfoSchema } from '@/types/Autonolas';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

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
  isStakingRewardsDetailsFetched?: boolean;
}>({
  updateRewards: async () => {},
});

const currentAgent = AGENT_CONFIG.trader; // TODO: replace with dynamic agent selection
const currentChainId = GNOSIS_CHAIN_CONFIG.evmChainId; // TODO: replace with selectedAgentConfig.chainId

/**
 * hook to fetch staking rewards details
 */
const useStakingRewardsDetails = () => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { selectedStakingProgramId } = useContext(StakingProgramContext);

  const { selectedService } = useServices();
  // const { service } = useService(selectedService?.service_config_id);

  const serviceConfigId = selectedService?.service_config_id;

  // fetch chain data from the selected service
  const chainData = !isNil(selectedService?.chain_configs)
    ? selectedService?.chain_configs?.[asMiddlewareChain(currentChainId)]
        .chain_data
    : null;
  const multisig = chainData?.multisig;
  const token = chainData?.token;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.REWARDS_KEY(
      currentChainId,
      serviceConfigId!,
      selectedStakingProgramId!,
      multisig!,
      token!,
    ),
    queryFn: async () => {
      const response = await currentAgent.serviceApi.getAgentStakingRewardsInfo(
        {
          agentMultisigAddress: multisig!,
          serviceId: token!,
          stakingProgramId: selectedStakingProgramId!,
          chainId: currentChainId,
        },
      );
      return StakingRewardsInfoSchema.parse(response);
    },
    enabled:
      !!isOnline &&
      !!serviceConfigId &&
      !!selectedStakingProgramId &&
      !!multisig &&
      !!token,
    refetchInterval: isOnline ? FIVE_SECONDS_INTERVAL : false,
    refetchOnWindowFocus: false,
  });
};

/**
 * hook to fetch available rewards for the current epoch
 */
const useAvailableRewardsForEpoch = () => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { selectedStakingProgramId } = useContext(StakingProgramContext);

  const { selectedService, isFetched: isServicesFetched } = useServices();
  const serviceConfigId =
    isServicesFetched && selectedService
      ? selectedService?.service_config_id
      : '';

  return useQuery({
    queryKey: REACT_QUERY_KEYS.AVAILABLE_REWARDS_FOR_EPOCH_KEY(
      currentChainId,
      serviceConfigId,
      selectedStakingProgramId!,
      currentChainId,
    ),
    queryFn: async () => {
      return await currentAgent.serviceApi.getAvailableRewardsForEpoch(
        selectedStakingProgramId!,
        currentChainId,
      );
    },
    enabled: !!isOnline && !!selectedStakingProgramId,
    refetchInterval: isOnline ? FIVE_SECONDS_INTERVAL : false,
    refetchOnWindowFocus: false,
  });
};

/**
 * Provider to manage rewards context
 */
export const RewardProvider = ({ children }: PropsWithChildren) => {
  const { storeState } = useStore();
  const electronApi = useElectronApi();

  const {
    data: stakingRewardsDetails,
    refetch: refetchStakingRewardsDetails,
    isFetched: isStakingRewardsDetailsFetched,
  } = useStakingRewardsDetails();
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

  // store the first staking reward achieved in the store for notification
  useEffect(() => {
    if (!isEligibleForRewards) return;
    if (storeState?.firstStakingRewardAchieved) return;
    electronApi.store?.set?.('firstStakingRewardAchieved', true);
  }, [
    electronApi.store,
    isEligibleForRewards,
    storeState?.firstStakingRewardAchieved,
  ]);

  // refresh rewards data
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
        isStakingRewardsDetailsFetched,
      }}
    >
      {children}
    </RewardContext.Provider>
  );
};
