import { useContext, useMemo } from 'react';

import { Chain } from '@/client';
import { SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES } from '@/constants/contractAddresses';
import { STAKING_PROGRAM_META } from '@/constants/stakingProgramMeta';
import { StakingProgramContext } from '@/context/StakingProgramContext';

/**
 * Hook to get the active staking program and its metadata, and the default staking program.
 * @returns {Object} The active staking program and its metadata.
 */
export const useStakingProgram = () => {
  const {
    activeStakingProgramId,
    defaultStakingProgramId,
    updateActiveStakingProgramId,
  } = useContext(StakingProgramContext);

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
    STAKING_PROGRAM_META[defaultStakingProgramId];

  const activeStakingProgramAddress = useMemo(() => {
    if (!activeStakingProgramId) return;
    return SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[Chain.GNOSIS][
      activeStakingProgramId
    ];
  }, [activeStakingProgramId]);

  const defaultStakingProgramAddress =
    SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[Chain.GNOSIS][
      defaultStakingProgramId
    ];

  return {
    activeStakingProgramAddress,
    activeStakingProgramId,
    activeStakingProgramMeta,
    defaultStakingProgramAddress,
    defaultStakingProgramId,
    defaultStakingProgramMeta,
    isActiveStakingProgramLoaded,
    updateActiveStakingProgramId,
  };
};
