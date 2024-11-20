import { useContext, useMemo } from 'react';

import {
  STAKING_PROGRAM_ADDRESS,
  STAKING_PROGRAMS,
  StakingProgramConfig,
} from '@/config/stakingPrograms';
import { StakingProgramContext } from '@/context/StakingProgramProvider';
import { StakingProgramId } from '@/enums/StakingProgram';

import { useServices } from './useServices';

/**
 * Hook to get the active staking program and its metadata.
 */
export const useStakingProgram = () => {
  const { isActiveStakingProgramsLoaded, activeStakingProgramId } = useContext(
    StakingProgramContext,
  );
  const { selectedAgentConfig } = useServices();
  const { homeChainId } = selectedAgentConfig;

  const allStakingProgramsKeys = Object.keys(STAKING_PROGRAMS[homeChainId]);
  const allStakingProgramNameAddressPair = STAKING_PROGRAM_ADDRESS[homeChainId];

  const activeStakingProgramsMeta = useMemo(() => {
    if (!isActiveStakingProgramsLoaded) return null;
    if (!activeStakingProgramId) return null;
    if (activeStakingProgramId.length === 0) return null;

    return (allStakingProgramsKeys as StakingProgramId[]).reduce(
      (acc, programId) => {
        if (activeStakingProgramId.includes(programId)) {
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
    activeStakingProgramId,
  ]);

  const activeStakingProgramsAddress = useMemo(() => {
    if (!activeStakingProgramId) return null;
    if (activeStakingProgramId.length === 0) return null;

    return (
      Object.keys(allStakingProgramNameAddressPair) as StakingProgramId[]
    ).reduce(
      (acc, programId) => {
        if (activeStakingProgramId.includes(programId)) {
          acc[programId] = allStakingProgramNameAddressPair[programId];
        }
        return acc;
      },
      {} as Record<StakingProgramId, string>,
    );
  }, [allStakingProgramNameAddressPair, activeStakingProgramId]);

  return {
    isActiveStakingProgramsLoaded,
    activeStakingProgramId,
    activeStakingProgramsAddress,
    activeStakingProgramsMeta,

    // all staking programs
    allStakingProgramIds: Object.keys(allStakingProgramNameAddressPair),
    allStakingProgramAddress: Object.values(allStakingProgramNameAddressPair),
  };
};
