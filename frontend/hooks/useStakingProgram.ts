import { useContext, useMemo } from 'react';

import { MiddlewareChain } from '@/client';
import { SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES } from '@/constants/contractAddresses';
import { STAKING_PROGRAM_META } from '@/constants/stakingProgramMeta';
import {
  DEFAULT_STAKING_PROGRAM_ID,
  StakingProgramContext,
} from '@/context/StakingProgramProvider';

/**
 * Hook to get the active staking program and its metadata, and the default staking program.
 * @returns {Object} The active staking program and its metadata.
 */
export const useStakingProgram = () => {
  const { activeStakingProgramId, updateActiveStakingProgramId } = useContext(
    StakingProgramContext,
  );

  const isActiveStakingProgramLoaded = activeStakingProgramId !== undefined;

  /**
   * TODO: implement enums
   * returns `StakingProgramMeta` if defined
   * returns `undefined` if not loaded
   * returns `null` if not actively staked
   */
  const activeStakingProgramMeta = useMemo(() => {
    if (activeStakingProgramId === undefined) return;
    if (activeStakingProgramId === null) return null;
    return STAKING_PROGRAM_META[activeStakingProgramId];
  }, [activeStakingProgramId]);

  const defaultStakingProgramMeta =
    STAKING_PROGRAM_META[DEFAULT_STAKING_PROGRAM_ID];

  const activeStakingProgramAddress = useMemo(() => {
    if (!activeStakingProgramId) return;
    return SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[MiddlewareChain.OPTIMISM][
      activeStakingProgramId
    ];
  }, [activeStakingProgramId]);

  const defaultStakingProgramAddress =
    SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[MiddlewareChain.OPTIMISM][
      DEFAULT_STAKING_PROGRAM_ID
    ];

  return {
    activeStakingProgramAddress,
    activeStakingProgramId,
    activeStakingProgramMeta,
    defaultStakingProgramAddress,
    defaultStakingProgramMeta,
    isActiveStakingProgramLoaded,
    updateActiveStakingProgramId,
  };
};
