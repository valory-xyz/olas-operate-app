import { useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { StakingProgramId } from '@/constants';
import { useServices, useStakingContractContext } from '@/hooks';

export const useEachStakingDetails = (stakingProgramId: StakingProgramId) => {
  const { selectedAgentConfig } = useServices();
  const stakingProgramMeta =
    STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][stakingProgramId];
  const { allStakingContractDetailsRecord } = useStakingContractContext();
  const contractDetails = allStakingContractDetailsRecord?.[stakingProgramId];
  const { maxNumServices = 0, serviceIds = [] } = contractDetails ?? {};

  return useMemo(() => {
    const usedSlots = serviceIds.length;
    const slotsLeft = maxNumServices - usedSlots;
    const slotPercentage =
      maxNumServices > 0 ? (usedSlots / maxNumServices) * 100 : 0;

    return {
      slotsLeft,
      slotPercentage,
      name: stakingProgramMeta.name,
      totalSlots: maxNumServices,
    };
  }, [maxNumServices, serviceIds, stakingProgramMeta.name]);
};
