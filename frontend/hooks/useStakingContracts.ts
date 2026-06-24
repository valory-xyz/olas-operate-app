import { useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { StakingProgramId } from '@/constants';
import { useServices, useStakingProgram } from '@/hooks';

export const useStakingContracts = () => {
  const { selectedAgentConfig, selectedAgentType } = useServices();
  const { evmHomeChainId } = selectedAgentConfig;
  const { isActiveStakingProgramLoaded, selectedStakingProgramId } =
    useStakingProgram();

  const currentStakingProgramId = isActiveStakingProgramLoaded
    ? selectedStakingProgramId
    : null;

  // Memoize so the array ref is stable across renders — `Object.keys(...).map(...)`
  // otherwise returns a fresh array every call, defeating downstream `useMemo`
  // and forcing every consumer effect that lists `orderedStakingProgramIds` in
  // its deps to fire on every render.
  const availableStakingProgramIds = useMemo(
    () =>
      Object.keys(STAKING_PROGRAMS[evmHomeChainId]).map(
        (stakingProgramIdKey) => stakingProgramIdKey as StakingProgramId,
      ),
    [evmHomeChainId],
  );
  const orderedStakingProgramIds = useMemo(
    () =>
      availableStakingProgramIds.reduce(
        (acc: StakingProgramId[], stakingProgramId: StakingProgramId) => {
          if (!isActiveStakingProgramLoaded) return acc;

          // If the program is deprecated, ignore it
          if (STAKING_PROGRAMS[evmHomeChainId][stakingProgramId].deprecated)
            return acc;

          // Put the active staking program at the top
          if (stakingProgramId === currentStakingProgramId)
            return [stakingProgramId, ...acc];

          // if the program is not supported by the agent type, ignore it
          if (
            !STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][
              stakingProgramId
            ].agentsSupported.includes(selectedAgentType)
          ) {
            return acc;
          }

          // Otherwise, append to the end
          return [...acc, stakingProgramId];
        },
        [],
      ),
    [
      availableStakingProgramIds,
      isActiveStakingProgramLoaded,
      currentStakingProgramId,
      selectedAgentConfig.evmHomeChainId,
      selectedAgentType,
      evmHomeChainId,
    ],
  );

  return { currentStakingProgramId, orderedStakingProgramIds };
};
