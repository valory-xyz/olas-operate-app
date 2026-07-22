import { useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { StakingProgramId } from '@/constants';
import { useServices, useStakingProgram } from '@/hooks';

export const useStakingContracts = () => {
  const { selectedAgentConfig, selectedAgentType, selectedService } =
    useServices();
  const { evmHomeChainId } = selectedAgentConfig;
  const { isActiveStakingProgramLoaded, activeStakingProgramId } =
    useStakingProgram();

  // The program stored on the middleware service record — set when the user
  // picks a contract, so it reflects an actual user choice (unlike the
  // agent-config default).
  const serviceStakingProgramId =
    selectedService?.chain_configs?.[selectedService?.home_chain]?.chain_data
      ?.user_params?.staking_program_id ?? null;

  // "Current" must never fall back to the agent-config default: showing the
  // default as the joined/selected contract fabricates a stake the user never
  // made (OPE-1841). Prefer the on-chain (subgraph) value, then the
  // service-stored choice; otherwise admit we don't know.
  const currentStakingProgramId = isActiveStakingProgramLoaded
    ? (activeStakingProgramId ?? serviceStakingProgramId)
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

          // Put the current staking program at the top — even if deprecated,
          // the user must be able to see the contract they are actually
          // staked in, otherwise the list can never mark it as selected.
          if (stakingProgramId === currentStakingProgramId)
            return [stakingProgramId, ...acc];

          // If the program is deprecated, ignore it
          if (STAKING_PROGRAMS[evmHomeChainId][stakingProgramId].deprecated)
            return acc;

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
