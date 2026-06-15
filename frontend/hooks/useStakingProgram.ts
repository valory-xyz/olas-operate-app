import { useContext, useMemo } from 'react';

import { STAKING_PROGRAMS, StakingProgramMap } from '@/config/stakingPrograms';
import { STAKING_PROGRAM_IDS } from '@/constants';
import { BASIUS_QA_NO_STAKING_MODE } from '@/constants/agent';
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
    if (!config.agentsSupported.includes(selectedAgentType)) return res;
    // QA build (BASIUS_QA_NO_STAKING_MODE=true): Basius's real staking
    // program points at a placeholder contract address (0x000…001) with
    // no on-chain code. Including it would cause every multicall to
    // BUFFER_OVERRUN and spam the console. Skip it — the QA flow uses
    // 'no_staking' instead.
    if (
      BASIUS_QA_NO_STAKING_MODE &&
      programId === STAKING_PROGRAM_IDS.BasiusAlpha1
    ) {
      return res;
    }
    res[programId] = config;
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
