import { useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { getRetiredProgramStatus } from '@/utils/stakingProgram';

import { useIsPolySafeService } from './useIsPolySafeService';
import { useServices } from './useServices';
import { useActiveStakingContractDetails } from './useStakingContractDetails';
import { useStakingProgram } from './useStakingProgram';
import { useStore } from './useStore';

/** The selected service's retired-program status, for the alert and the start gate; `null` off a retired program. */
export const useRetiredProgramStatus = () => {
  const { selectedService, selectedAgentConfig } = useServices();
  const { selectedStakingProgramMeta } = useStakingProgram();
  const { storeState } = useStore();
  const {
    isOnRetiredProgram,
    retiredSafeState,
    isMultisigTypeFetching,
    refetch: refetchMultisigType,
  } = useIsPolySafeService();
  const {
    stakingDetailsState,
    isSelectedStakingContractDetailsFetching,
    refetchSelectedStakingContractDetails,
  } = useActiveStakingContractDetails();

  const status = useMemo(
    () =>
      isOnRetiredProgram
        ? getRetiredProgramStatus({
            safeState: retiredSafeState,
            stakingDetails: stakingDetailsState,
          })
        : null,
    [isOnRetiredProgram, retiredSafeState, stakingDetailsState],
  );

  // A withdrawal-only service is stored as `no_staking`; its retired program
  // was saved before that PATCH.
  const storedRetiredProgramId = selectedService
    ? storeState?.retiredStakingProgramIdByServiceConfigId?.[
        selectedService.service_config_id
      ]
    : undefined;
  const stakingProgramName =
    selectedStakingProgramMeta?.name ??
    (storedRetiredProgramId
      ? STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId]?.[
          storedRetiredProgramId
        ]?.name
      : undefined);

  const safeTypeRetry = useMemo(
    () => ({
      onRetry: () => void refetchMultisigType(),
      isRetrying: isMultisigTypeFetching,
    }),
    [refetchMultisigType, isMultisigTypeFetching],
  );
  const stakingDetailsRetry = useMemo(
    () => ({
      onRetry: () => void refetchSelectedStakingContractDetails(),
      isRetrying: isSelectedStakingContractDetailsFetching,
    }),
    [
      refetchSelectedStakingContractDetails,
      isSelectedStakingContractDetailsFetching,
    ],
  );

  return { status, stakingProgramName, safeTypeRetry, stakingDetailsRetry };
};
