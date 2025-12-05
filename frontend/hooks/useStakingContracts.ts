import { useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';

export const useStakingContracts = () => {
  const { selectedAgentConfig, selectedAgentType } = useServices();
  const { evmHomeChainId } = selectedAgentConfig;
  const {
    activeStakingProgramId,
    isActiveStakingProgramLoaded,
    defaultStakingProgramId,
  } = useStakingProgram();

  const currentStakingProgramId = isActiveStakingProgramLoaded
    ? activeStakingProgramId || defaultStakingProgramId
    : null;

  const availableStakingProgramIds = Object.keys(
    STAKING_PROGRAMS[evmHomeChainId],
  ).map((stakingProgramIdKey) => stakingProgramIdKey as StakingProgramId);

  const orderedStakingProgramIds = useMemo(
    () =>
      availableStakingProgramIds.reduce(
        (acc: StakingProgramId[], stakingProgramId: StakingProgramId) => {
          if (!isActiveStakingProgramLoaded) return acc;

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
    ],
  );

  return { currentStakingProgramId, orderedStakingProgramIds };
};
