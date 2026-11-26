import { useCallback, useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { NO_STAKING_PROGRAM_ID } from '@/constants';
import { useIsPolySafeService, useServices, useStakingProgram } from '@/hooks';
import {
  getCompatibleStakingProgramIds,
  getServiceStakingProgramId,
  hasUnstakedOption,
} from '@/utils/stakingProgram';

export const useStakingContracts = () => {
  const { selectedAgentConfig, selectedAgentType, selectedService } =
    useServices();
  const { evmHomeChainId } = selectedAgentConfig;
  const { isActiveStakingProgramLoaded, activeStakingProgramId } =
    useStakingProgram();
  const {
    isPolySafeService,
    isMultisigTypeLoaded,
    isMultisigTypeError,
    refetch: refetchMultisigType,
  } = useIsPolySafeService();

  // The program stored on the middleware service record — set when the user
  // picks a contract, so it reflects an actual user choice (unlike the
  // agent-config default).
  const serviceStakingProgramId =
    getServiceStakingProgramId(selectedService) ?? null;

  // "Current" must never fall back to the agent-config default: showing the
  // default as the joined/selected contract fabricates a stake the user never
  // made (OPE-1841). Prefer the on-chain (subgraph) value, then the
  // service-stored choice; otherwise admit we don't know.
  const currentStakingProgramId = isActiveStakingProgramLoaded
    ? (activeStakingProgramId ?? serviceStakingProgramId)
    : null;

  const isStakingContractsLoaded =
    isActiveStakingProgramLoaded && isMultisigTypeLoaded;

  // The multisig type could not be verified (RPC failure). The list is kept
  // empty rather than guessing: a wrong guess would offer contracts that
  // reject the stake on-chain.
  const isStakingContractsError =
    isStakingContractsLoaded && isMultisigTypeError;

  // Memoize so the array ref is stable across renders — downstream `useMemo`s
  // and effects list `orderedStakingProgramIds` in their deps.
  const withUnstakedOption = hasUnstakedOption(
    selectedAgentConfig,
    evmHomeChainId,
  );

  const orderedStakingProgramIds = useMemo(() => {
    if (!isStakingContractsLoaded || isStakingContractsError) return [];
    const programIds = getCompatibleStakingProgramIds({
      programs: STAKING_PROGRAMS[evmHomeChainId],
      agentType: selectedAgentType,
      isPolySafeService,
      currentStakingProgramId,
    });
    return withUnstakedOption
      ? [NO_STAKING_PROGRAM_ID, ...programIds]
      : programIds;
  }, [
    isStakingContractsLoaded,
    isStakingContractsError,
    evmHomeChainId,
    selectedAgentType,
    isPolySafeService,
    currentStakingProgramId,
    withUnstakedOption,
  ]);

  const retryStakingContracts = useCallback(() => {
    refetchMultisigType();
  }, [refetchMultisigType]);

  return {
    currentStakingProgramId,
    orderedStakingProgramIds,
    isStakingContractsLoaded,
    isStakingContractsError,
    retryStakingContracts,
  };
};
