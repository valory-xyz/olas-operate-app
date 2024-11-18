import { useContext, useMemo } from 'react';

import { STAKING_PROGRAM_ADDRESS } from '@/config/stakingPrograms';
import { GNOSIS_STAKING_PROGRAMS } from '@/config/stakingPrograms/gnosis';
import { StakingProgramContext } from '@/context/StakingProgramProvider';

import { useChainId } from './useChainId';

/**
 * Hook to get the active staking program and its metadata, and the default staking program.
 */
export const useStakingProgram = () => {
  const chainId = useChainId();
  const { activeStakingProgramId, isActiveStakingProgramLoaded } = useContext(
    StakingProgramContext,
  );

  const activeStakingProgramMeta = useMemo(() => {
    if (!activeStakingProgramId) return null;
    return GNOSIS_STAKING_PROGRAMS[activeStakingProgramId];
  }, [activeStakingProgramId]);

  // const defaultStakingProgramMeta =
  //   STAKING_PROGRAM_META[DEFAULT_STAKING_PROGRAM_ID];

  const activeStakingProgramAddress = useMemo(() => {
    if (!activeStakingProgramId) return null;
    return STAKING_PROGRAM_ADDRESS[chainId][activeStakingProgramId];
  }, [chainId, activeStakingProgramId]);

  // const defaultStakingProgramAddress =
  //   SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[
  //     MiddlewareChain.OPTIMISM
  //   ][DEFAULT_STAKING_PROGRAM_ID];

  return {
    activeStakingProgramId,
    activeStakingProgramAddress,
    activeStakingProgramMeta,
    // defaultStakingProgramAddress,
    // defaultStakingProgramMeta,
    isActiveStakingProgramLoaded,
  };
};
