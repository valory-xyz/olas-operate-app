import { useContext, useMemo } from 'react';

import {
  STAKING_PROGRAM_ADDRESS,
  STAKING_PROGRAMS,
  StakingProgramConfig,
} from '@/config/stakingPrograms';
import { StakingProgramsContext } from '@/context/StakingProgramsProvider';
import { StakingProgramId } from '@/enums/StakingProgram';

import { useChainId } from './useChainId';

/**
 * Hook to get the active staking program and its metadata.
 */
export const useStakingPrograms = () => {
  const chainId = useChainId();
  const { isActiveStakingProgramsLoaded, activeStakingProgramsId } = useContext(
    StakingProgramsContext,
  );

  const activeStakingProgramsMeta = useMemo(() => {
    if (!activeStakingProgramsId) return null;
    if (activeStakingProgramsId.length === 0) return null;

    if (!isActiveStakingProgramsLoaded) return null;

    const allStakingProgramsKeys = Object.keys(STAKING_PROGRAMS[chainId]);
    return (allStakingProgramsKeys as StakingProgramId[]).reduce(
      (acc, programId) => {
        if (activeStakingProgramsId.includes(programId)) {
          acc[programId] = STAKING_PROGRAMS[chainId][programId];
        }
        return acc;
      },
      {} as Record<StakingProgramId, StakingProgramConfig>,
    );
  }, [chainId, isActiveStakingProgramsLoaded, activeStakingProgramsId]);

  const activeStakingProgramsAddress = useMemo(() => {
    if (!activeStakingProgramsId) return null;
    if (activeStakingProgramsId.length === 0) return null;

    const stakingProgramAddress = STAKING_PROGRAM_ADDRESS[chainId];
    return (Object.keys(stakingProgramAddress) as StakingProgramId[]).reduce(
      (acc, programId) => {
        if (activeStakingProgramsId.includes(programId)) {
          acc[programId] = stakingProgramAddress[programId];
        }
        return acc;
      },
      {} as Record<StakingProgramId, string>,
    );
  }, [chainId, activeStakingProgramsId]);

  return {
    isActiveStakingProgramsLoaded,
    activeStakingProgramsId,
    activeStakingProgramsAddress,
    activeStakingProgramsMeta,
  };
};
