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

import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useStore } from '@/hooks/useStore';
import { AutonolasService } from '@/service/Autonolas';

import { OnlineStatusContext } from './OnlineStatusProvider';
import { ServicesContext } from './ServicesProvider';

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
  const { services } = useContext(ServicesContext);
  const service = useMemo(() => services?.[0], [services]);
  const { storeState } = useStore();
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
    if (service?.chain_data?.multisig && service?.chain_data?.token) {
      stakingRewardsInfoPromise = AutonolasService.getAgentStakingRewardsInfo({
        agentMultisigAddress: service?.chain_data?.multisig,
        serviceId: service?.chain_data?.token,
      });
    }

    const epochRewardsPromise = AutonolasService.getAvailableRewardsForEpoch();
    const [stakingRewardsInfo, rewards] = await Promise.all([
      stakingRewardsInfoPromise,
      epochRewardsPromise,
    ]);

    setIsEligibleForRewards(stakingRewardsInfo?.isEligibleForRewards);
    setAccruedServiceStakingRewards(
      stakingRewardsInfo?.accruedServiceStakingRewards,
    );
    setAvailableRewardsForEpoch(rewards);
  }, [service]);

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
