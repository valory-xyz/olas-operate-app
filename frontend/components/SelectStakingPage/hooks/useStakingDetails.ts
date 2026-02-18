import { useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { StakingProgramId } from '@/constants';
import { useServices, useStakingContractContext } from '@/hooks';

export const useEachStakingDetails = (stakingProgramId: StakingProgramId) => {
  const { selectedAgentConfig } = useServices();
  const { allStakingContractDetailsRecord } = useStakingContractContext();

  const stakingProgramMeta =
    STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][stakingProgramId];
  const contractDetails = allStakingContractDetailsRecord?.[stakingProgramId];
  const { maxNumServices = 0, serviceIds = [] } = contractDetails ?? {};

  return useMemo(() => {
    const usedSlots = serviceIds.length;
    const slotsLeft = maxNumServices - usedSlots;

    return {
      slotsLeft,
      name: stakingProgramMeta.name,
      totalSlots: maxNumServices,
    };
  }, [maxNumServices, serviceIds, stakingProgramMeta.name]);
};
