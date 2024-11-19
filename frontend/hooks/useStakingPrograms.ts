import { useContext, useMemo } from 'react';

import {
  STAKING_PROGRAM_ADDRESS,
  STAKING_PROGRAMS,
  StakingProgramConfig,
} from '@/config/stakingPrograms';
import { StakingProgramsContext } from '@/context/StakingProgramsProvider';
import { StakingProgramId } from '@/enums/StakingProgram';

import { useServices } from './useServices';

/**
 * Hook to get the active staking program and its metadata.
 */
export const useStakingPrograms = () => {
  const { isActiveStakingProgramsLoaded, activeStakingProgramsId } = useContext(
    StakingProgramsContext,
  );
  const { selectedAgentConfig } = useServices();
  const { homeChainId } = selectedAgentConfig;

  const allStakingProgramsKeys = Object.keys(STAKING_PROGRAMS[homeChainId]);
  const allStakingProgramNameAddressPair = STAKING_PROGRAM_ADDRESS[homeChainId];

  const activeStakingProgramsMeta = useMemo(() => {
    if (!isActiveStakingProgramsLoaded) return null;
    if (!activeStakingProgramsId) return null;
    if (activeStakingProgramsId.length === 0) return null;

    return (allStakingProgramsKeys as StakingProgramId[]).reduce(
      (acc, programId) => {
        if (activeStakingProgramsId.includes(programId)) {
          acc[programId] = STAKING_PROGRAMS[homeChainId][programId];
        }
        return acc;
      },
      {} as Record<StakingProgramId, StakingProgramConfig>,
    );
  }, [
    homeChainId,
    isActiveStakingProgramsLoaded,
    allStakingProgramsKeys,
    activeStakingProgramsId,
  ]);

  const activeStakingProgramsAddress = useMemo(() => {
    if (!activeStakingProgramsId) return null;
    if (activeStakingProgramsId.length === 0) return null;

    return (
      Object.keys(allStakingProgramNameAddressPair) as StakingProgramId[]
    ).reduce(
      (acc, programId) => {
        if (activeStakingProgramsId.includes(programId)) {
          acc[programId] = allStakingProgramNameAddressPair[programId];
        }
        return acc;
      },
      {} as Record<StakingProgramId, string>,
    );
  }, [allStakingProgramNameAddressPair, activeStakingProgramsId]);

  return {
    isActiveStakingProgramsLoaded,
    activeStakingProgramsId,
    activeStakingProgramsAddress,
    activeStakingProgramsMeta,

    // all staking programs
    allStakingProgramIds: Object.keys(allStakingProgramNameAddressPair),
    allStakingProgramAddress: Object.values(allStakingProgramNameAddressPair),
  };
};
