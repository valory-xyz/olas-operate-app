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
import { useStore } from '@/hooks/useStore';
import { AutonolasService } from '@/service/Autonolas';

import { OnlineStatusContext } from './OnlineStatusProvider';
import { ServicesContext } from './ServicesProvider';
import { StakingProgramContext } from './StakingProgramContext';

export const RewardContext = createContext<{
  accruedServiceStakingRewards?: number;
  availableRewardsForEpoch?: number;
  availableRewardsForEpochEth?: number;
  isEligibleForRewards?: boolean;
  isRewardsLoaded: boolean;
  optimisticRewardsEarnedForEpoch?: number;
  minimumStakedAmountRequired?: number;
  updateRewards: () => Promise<void>;
}>({
  accruedServiceStakingRewards: undefined,
  availableRewardsForEpoch: undefined,
  availableRewardsForEpochEth: undefined,
  isEligibleForRewards: undefined,
  isRewardsLoaded: false,
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
  const { activeStakingProgram, defaultStakingProgram } = useContext(
    StakingProgramContext,
  );

  const [accruedServiceStakingRewards, setAccruedServiceStakingRewards] =
    useState<number>();
  const [availableRewardsForEpoch, setAvailableRewardsForEpoch] =
    useState<number>();
  const [isEligibleForRewards, setIsEligibleForRewards] = useState<boolean>();

  const [isRewardsLoaded, setIsRewardsLoaded] = useState<boolean>(false);

  const availableRewardsForEpochEth = useMemo<number | undefined>(() => {
    if (!availableRewardsForEpoch) return;

    const formatRewardsEth = parseFloat(
      ethers.utils.formatUnits(`${availableRewardsForEpoch}`, 18),
    );

    return formatRewardsEth;
  }, [availableRewardsForEpoch]);

  const optimisticRewardsEarnedForEpoch = useMemo<number | undefined>(() => {
    if (!isRewardsLoaded) return;

    if (isEligibleForRewards && availableRewardsForEpochEth) {
      return availableRewardsForEpochEth;
    }
    return 0;
  }, [availableRewardsForEpochEth, isEligibleForRewards, isRewardsLoaded]);

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

    // can fallback to default staking program if no current staking program is active
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
    setIsRewardsLoaded(true);
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
        isRewardsLoaded,
        optimisticRewardsEarnedForEpoch,
        updateRewards,
      }}
    >
      {children}
    </RewardContext.Provider>
  );
};
