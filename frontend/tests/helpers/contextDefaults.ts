import { createElement, PropsWithChildren } from 'react';

import { StakingProgramId } from '../../constants/stakingProgram';
import { OnlineStatusContext } from '../../context/OnlineStatusProvider';
import { StakingProgramContext } from '../../context/StakingProgramProvider';

type StakingProgramContextValue = {
  isActiveStakingProgramLoaded: boolean;
  activeStakingProgramId?: StakingProgramId;
  defaultStakingProgramId?: StakingProgramId;
  selectedStakingProgramId: StakingProgramId | null;
  setDefaultStakingProgramId: (id: StakingProgramId) => void;
  stakingProgramIdToMigrateTo: StakingProgramId | null;
  setStakingProgramIdToMigrateTo: (id: StakingProgramId | null) => void;
  stakingProgramIdByServiceConfigId: Map<string, StakingProgramId | null>;
};

/** Default StakingProgramContext value for tests. Override individual fields as needed. */
export const createStakingProgramContextValue = (
  overrides: Partial<StakingProgramContextValue> = {},
): StakingProgramContextValue => ({
  isActiveStakingProgramLoaded: true,
  activeStakingProgramId: undefined,
  defaultStakingProgramId: undefined,
  selectedStakingProgramId: null,
  setDefaultStakingProgramId: jest.fn(),
  stakingProgramIdToMigrateTo: null,
  setStakingProgramIdToMigrateTo: jest.fn(),
  stakingProgramIdByServiceConfigId: new Map(),
  ...overrides,
});

/** Creates a wrapper that provides StakingProgramContext with optional overrides. */
export const createStakingProgramContextWrapper = (
  overrides: Partial<StakingProgramContextValue> = {},
) => {
  const value = createStakingProgramContextValue(overrides);
  const StakingProgramContextWrapper = ({ children }: PropsWithChildren) =>
    createElement(StakingProgramContext.Provider, { value }, children);
  return StakingProgramContextWrapper;
};

/** Creates a wrapper that provides OnlineStatusContext. */
export const createOnlineStatusWrapper = (isOnline = true) => {
  const OnlineStatusWrapper = ({ children }: PropsWithChildren) =>
    createElement(
      OnlineStatusContext.Provider,
      { value: { isOnline } },
      children,
    );
  return OnlineStatusWrapper;
};
