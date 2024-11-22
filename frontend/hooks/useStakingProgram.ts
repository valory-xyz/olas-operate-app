import { useContext, useMemo } from 'react';

import {
  STAKING_PROGRAM_ADDRESS,
  STAKING_PROGRAMS,
  StakingProgramConfig,
} from '@/config/stakingPrograms';
import { StakingProgramContext } from '@/context/StakingProgramProvider';
import { StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';
import { Nullable } from '@/types/Util';

import { useServices } from './useServices';

/**
 * Hook to get the staking program and its metadata.
 */
export const useStakingProgram = () => {
  const {
    isActiveStakingProgramLoaded,
    activeStakingProgramId,
    initialDefaultStakingProgramId,
  } = useContext(StakingProgramContext);
  const { selectedAgentConfig } = useServices();
  const { homeChainId } = selectedAgentConfig;

  const allStakingProgramsKeys = Object.keys(STAKING_PROGRAMS[homeChainId]);
  const allStakingProgramNameAddressPair = STAKING_PROGRAM_ADDRESS[homeChainId];

  // TODO: refactor to support allStakingPrograms, previously this was intended solely for the active staking program
  const allStakingProgramsMeta = useMemo(() => {
    if (!isActiveStakingProgramLoaded) return null;
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
    isActiveStakingProgramLoaded,
    allStakingProgramsKeys,
    activeStakingProgramId,
  ]);

  const activeStakingProgramMeta = useMemo(() => {
    if (!isActiveStakingProgramLoaded) return null;
    if (!activeStakingProgramId) return null;
    if (!allStakingProgramsMeta) return null;

    return allStakingProgramsMeta[activeStakingProgramId];
  }, [
    isActiveStakingProgramLoaded,
    allStakingProgramsMeta,
    activeStakingProgramId,
  ]);

  const activeStakingProgramAddress: Nullable<Address> = useMemo(() => {
    if (!activeStakingProgramId) return null;
    return allStakingProgramNameAddressPair[activeStakingProgramId];
  }, [allStakingProgramNameAddressPair, activeStakingProgramId]);

  return {
    initialDefaultStakingProgramId,

    // active staking program
    isActiveStakingProgramLoaded,
    activeStakingProgramId,
    activeStakingProgramAddress,
    activeStakingProgramMeta,

    // all staking programs
    allStakingProgramIds: Object.keys(allStakingProgramNameAddressPair),
    allStakingProgramAddress: Object.values(allStakingProgramNameAddressPair),
    allStakingProgramsMeta,
  };
};
