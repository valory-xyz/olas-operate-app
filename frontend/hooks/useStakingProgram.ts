import { useContext, useMemo } from 'react';

import { STAKING_PROGRAM_ADDRESS } from '@/config/stakingPrograms';
import { GNOSIS_STAKING_PROGRAMS } from '@/config/stakingPrograms/gnosis';
import { StakingProgramsContext } from '@/context/StakingProgramsProvider';

import { useChainId } from './useChainId';

/**
 * Hook to get the active staking program and its metadata.
 */
export const useStakingProgram = () => {
  const chainId = useChainId();
  const { activeStakingProgramId, isActiveStakingProgramLoaded } = useContext(
    StakingProgramsContext,
  );

  const activeStakingProgramMeta = useMemo(() => {
    if (!activeStakingProgramId) return null;
    return GNOSIS_STAKING_PROGRAMS[activeStakingProgramId];
  }, [activeStakingProgramId]);

  const activeStakingProgramAddress = useMemo(() => {
    if (!activeStakingProgramId) return null;
    return STAKING_PROGRAM_ADDRESS[chainId][activeStakingProgramId];
  }, [chainId, activeStakingProgramId]);

  return {
    isActiveStakingProgramLoaded,
    activeStakingProgramId,
    activeStakingProgramAddress,
    activeStakingProgramMeta,
  };
};
