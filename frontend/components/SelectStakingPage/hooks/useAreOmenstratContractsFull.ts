import { isNil } from 'lodash';

import { AgentMap, OMENSTRAT_PROGRAM_IDS } from '@/constants';
import { useServices, useStakingContractContext } from '@/hooks';

/**
 * Whether Omenstrat's contract list should point at Connect: every new
 * Omenstrat contract has no free slot. A contract whose details have not
 * loaded counts as not full, so the hint never shows on a guess.
 */
export const useAreOmenstratContractsFull = () => {
  const { selectedAgentType } = useServices();
  const { allStakingContractDetailsRecord } = useStakingContractContext();

  if (selectedAgentType !== AgentMap.PredictTrader) return false;

  return OMENSTRAT_PROGRAM_IDS.every((programId) => {
    const details = allStakingContractDetailsRecord?.[programId];
    if (isNil(details?.serviceIds) || isNil(details?.maxNumServices)) {
      return false;
    }
    return details.serviceIds.length >= details.maxNumServices;
  });
};
