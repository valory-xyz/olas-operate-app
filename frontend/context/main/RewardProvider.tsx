import { ethers } from 'ethers';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useInterval } from 'usehooks-ts';

import { CHAINS } from '@/constants/chains';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { useStore } from '@/hooks/useStore';
import { AutonolasService } from '@/service/Autonolas';

import { OnlineStatusContext } from '../OnlineStatusProvider';

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

export const RewardProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);

  const { service } = useServices();
  const { storeState } = useStore();
  const { activeStakingProgram, defaultStakingProgram } = useStakingProgram();

  const electronApi = useElectronApi();

  const [accruedServiceStakingRewards, setAccruedServiceStakingRewards] =
    useState<number>();
  const [availableRewardsForEpoch, setAvailableRewardsForEpoch] =
    useState<number>();
  const [isEligibleForRewards, setIsEligibleForRewards] = useState<boolean>();

  const availableRewardsForEpochEth = useMemo<number | undefined>(() => {
    if (!availableRewardsForEpoch) return;
    const formatRewardsEth = parseFloat(
      ethers.utils.formatUnits(`${availableRewardsForEpoch}`, 18),
    );

    return formatRewardsEth;
  }, [availableRewardsForEpoch]);

  const optimisticRewardsEarnedForEpoch = useMemo<number | undefined>(() => {
    if (isEligibleForRewards && availableRewardsForEpochEth) {
      return availableRewardsForEpochEth;
    }
    return;
  }, [availableRewardsForEpochEth, isEligibleForRewards]);

  const updateRewards = useCallback(async (): Promise<void> => {
    let stakingRewardsInfoPromise;

    // only check for rewards if there's a currentStakingProgram active
    if (
      activeStakingProgram &&
      service?.chain_configs[CHAINS.GNOSIS.chainId].chain_data?.multisig &&
      service?.chain_configs[CHAINS.GNOSIS.chainId].chain_data?.token
    ) {
      stakingRewardsInfoPromise = AutonolasService.getAgentStakingRewardsInfo({
        agentMultisigAddress:
          service.chain_configs[CHAINS.GNOSIS.chainId].chain_data.multisig!,
        serviceId:
          service.chain_configs[CHAINS.GNOSIS.chainId].chain_data.token!,
        stakingProgram: activeStakingProgram,
      });
    }

    /**
     * if the active staking program has not loaded
     * set default values
     */
    if (activeStakingProgram === undefined) {
      setIsEligibleForRewards(false);
      setAccruedServiceStakingRewards(0); // TODO: consider null for loading states
      setAvailableRewardsForEpoch(0);
      return;
    }

    const epochRewardsPromise = AutonolasService.getAvailableRewardsForEpoch(
      activeStakingProgram ?? defaultStakingProgram,
    );

    const [stakingRewardsInfo, rewards] = await Promise.all([
      stakingRewardsInfoPromise,
      epochRewardsPromise,
    ]);

    setIsEligibleForRewards(stakingRewardsInfo?.isEligibleForRewards);
    setAccruedServiceStakingRewards(
      stakingRewardsInfo?.accruedServiceStakingRewards,
    );
    setAvailableRewardsForEpoch(rewards);
  }, [activeStakingProgram, defaultStakingProgram, service]);

  useEffect(() => {
    if (isEligibleForRewards && !storeState?.firstStakingRewardAchieved) {
      electronApi.store?.set?.('firstStakingRewardAchieved', true);
    }
  }, [
    electronApi.store,
    isEligibleForRewards,
    storeState?.firstStakingRewardAchieved,
  ]);

  useInterval(
    async () => updateRewards(),
    isOnline ? FIVE_SECONDS_INTERVAL : null,
  );

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
