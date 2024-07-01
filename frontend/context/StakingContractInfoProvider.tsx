import { createContext, PropsWithChildren, useEffect, useState } from 'react';

import { AutonolasService } from '@/service/Autonolas';

type StakingContractInfoProviderContextType = {
  isStakingContractInfoLoading: boolean;
  isRewardsAvailable: boolean;
  hasEnoughServiceSlots: boolean;
  isAgentEvicted: boolean; // TODO: Implement this
  canStartAgent: boolean;
};

export const StakingContractInfoProviderContext =
  createContext<StakingContractInfoProviderContextType>({
    isStakingContractInfoLoading: true,
    isRewardsAvailable: false,
    hasEnoughServiceSlots: false,
    isAgentEvicted: false,
    canStartAgent: false,
  });

export const StakingContractInfoProviderProvider = ({
  children,
}: PropsWithChildren) => {
  const [isStakingContractInfoLoading, setIsStakingContractInfoLoading] =
    useState(true);
  const [isRewardsAvailable, setIsRewardsAvailable] = useState(false);
  const [hasEnoughServiceSlots, setHasEnoughServiceSlots] = useState(false);
  const [isAgentEvicted, setIsAgentEvicted] = useState(false);
  const [canStartAgent, setCanStartAgent] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setIsStakingContractInfoLoading(true);

        const info = await AutonolasService.getStakingContractInfo();
        if (!info) return;

        const { availableRewards, maxNumServices, serviceIds } = info;
        const isRewardsAvailable = availableRewards > 0;
        const hasEnoughServiceSlots = serviceIds.length < maxNumServices;
        const canStartAgent = isRewardsAvailable && hasEnoughServiceSlots;

        setIsRewardsAvailable(isRewardsAvailable);
        setHasEnoughServiceSlots(hasEnoughServiceSlots);
        setCanStartAgent(canStartAgent);
        setIsAgentEvicted(false); // TODO: Implement this
      } catch (error) {
        console.error('Failed to fetch staking contract info', error);
      } finally {
        setIsStakingContractInfoLoading(false);
      }
    })();
  }, []);

  return (
    <StakingContractInfoProviderContext.Provider
      value={{
        isStakingContractInfoLoading,
        isRewardsAvailable,
        hasEnoughServiceSlots,
        isAgentEvicted,
        canStartAgent,
      }}
    >
      {children}
    </StakingContractInfoProviderContext.Provider>
  );
};
