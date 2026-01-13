import { useContext, useMemo } from 'react';

import { STAKING_PROGRAMS, StakingProgramMap } from '@/config/stakingPrograms';
import { StakingProgramContext } from '@/context/StakingProgramProvider';

import { useServices } from './useServices';

/**
 * Hook to get the staking program and its metadata.
 */
export const useStakingProgram = () => {
  const {
    isActiveStakingProgramLoaded,
    activeStakingProgramId,
    defaultStakingProgramId,
    selectedStakingProgramId,
    setDefaultStakingProgramId,
    stakingProgramIdToMigrateTo,
    setStakingProgramIdToMigrateTo,
  } = useContext(StakingProgramContext);
  const { selectedAgentConfig, selectedAgentType } = useServices();

  const allAvailableStakingPrograms = Object.entries(
    STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId],
  ).reduce((res, [programId, config]) => {
    if (config.agentsSupported.includes(selectedAgentType)) {
      res[programId] = config;
    }
    return res;
  }, {} as StakingProgramMap);

  const defaultStakingProgramMeta = useMemo(() => {
    if (!defaultStakingProgramId) return null;
    return STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][
      defaultStakingProgramId
    ];
  }, [defaultStakingProgramId, selectedAgentConfig.evmHomeChainId]);

  const selectedStakingProgramMeta = useMemo(() => {
    if (!selectedStakingProgramId) return null;
    return STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][
      selectedStakingProgramId
    ];
  }, [selectedAgentConfig.evmHomeChainId, selectedStakingProgramId]);

  return {
    // active staking program (on-chain)
    isActiveStakingProgramLoaded,
    activeStakingProgramId,

    // default staking program
    defaultStakingProgramId,
    defaultStakingProgramMeta,
    setDefaultStakingProgramId,

    // selected staking program id
    selectedStakingProgramId,
    selectedStakingProgramMeta,

    // all staking programs
    allStakingProgramIds: Object.keys(allAvailableStakingPrograms),
    allStakingProgramsMeta: allAvailableStakingPrograms,

    // staking program id to migrate to
    stakingProgramIdToMigrateTo,
    setStakingProgramIdToMigrateTo,
  };
};
