import { isNil } from 'lodash';
import { useMemo } from 'react';

import { STAKING_PROGRAMS, StakingProgramMap } from '@/config/stakingPrograms';
import { AgentMap, EvmChainIdMap, StakingProgramId } from '@/constants';
import { useServices, useStakingContractContext } from '@/hooks';
import { hasFreeServiceSlot } from '@/utils/stakingProgram';

/**
 * The Omenstrat contracts a new PredictTrader can join: the decoupled-activity
 * ones (they carry an `activityTarget`) that are still offered.
 */
export const getOmenstratProgramIds = (
  programs: StakingProgramMap,
): StakingProgramId[] =>
  Object.entries(programs)
    .filter(
      ([, program]) =>
        program.agentsSupported.includes(AgentMap.PredictTrader) &&
        !isNil(program.activityTarget) &&
        !program.deprecated,
    )
    .map(([id]) => id as StakingProgramId);

/**
 * Whether Omenstrat's contract list should point at Connect: every Omenstrat
 * contract has no free slot. A contract whose details have not loaded counts
 * as not full, so the hint never shows on a guess.
 */
export const useAreOmenstratContractsFull = () => {
  const { selectedAgentType } = useServices();
  const { allStakingContractDetailsRecord } = useStakingContractContext();
  const programIds = useMemo(
    () => getOmenstratProgramIds(STAKING_PROGRAMS[EvmChainIdMap.Gnosis]),
    [],
  );

  if (selectedAgentType !== AgentMap.PredictTrader) return false;
  if (programIds.length === 0) return false;

  return programIds.every(
    (programId) =>
      hasFreeServiceSlot(allStakingContractDetailsRecord?.[programId]) ===
      false,
  );
};
