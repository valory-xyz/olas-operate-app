import { renderHook } from '@testing-library/react';

import { useActivityGoal } from '../../hooks/useActivityGoal';
import { useEpochWorkStatus } from '../../hooks/useEpochWorkStatus';
import { useRewardContext } from '../../hooks/useRewardContext';
import { useServices } from '../../hooks/useServices';
import { ActivityGoal } from '../../types/Agent';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_TS_CHECKPOINT,
  makeActivityGoal,
  makeService,
  makeStakingRewardsInfo,
} from '../helpers/factories';

jest.mock('../../hooks/useActivityGoal', () => ({
  useActivityGoal: jest.fn(),
}));
jest.mock('../../hooks/useRewardContext', () => ({
  useRewardContext: jest.fn(),
}));
jest.mock('../../hooks/useServices', () => ({ useServices: jest.fn() }));

const mockUseActivityGoal = useActivityGoal as jest.Mock;
const mockUseRewardContext = useRewardContext as jest.Mock;
const mockUseServices = useServices as jest.Mock;

const setup = ({
  isEpochTargetMet,
  activityGoal = null,
  isLoading = false,
  isUnavailable = false,
  hasRewardsDetails = true,
}: {
  isEpochTargetMet: boolean | undefined;
  activityGoal?: ActivityGoal | null;
  isLoading?: boolean;
  isUnavailable?: boolean;
  hasRewardsDetails?: boolean;
}) => {
  mockUseRewardContext.mockReturnValue({
    isEpochTargetMet,
    stakingRewardsDetails: hasRewardsDetails
      ? makeStakingRewardsInfo({ tsCheckpoint: DEFAULT_TS_CHECKPOINT })
      : undefined,
  });
  mockUseActivityGoal.mockReturnValue({
    activityGoal,
    isLoading,
    isUnavailable,
  });
  return renderHook(() => useEpochWorkStatus()).result.current;
};

describe('useEpochWorkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      }),
    });
  });

  it('reads the goal of the selected instance', () => {
    setup({ isEpochTargetMet: false });
    expect(mockUseActivityGoal).toHaveBeenCalledWith(DEFAULT_SERVICE_CONFIG_ID);
  });

  it('is working before the staking KPI is met', () => {
    expect(setup({ isEpochTargetMet: false })).toEqual({
      isEpochTargetMet: false,
      isActivityGoalMet: undefined,
      isDoneForEpoch: false,
      workStatus: 'working',
    });
  });

  it('stays working when the goal is met before the staking KPI', () => {
    const status = setup({
      isEpochTargetMet: false,
      activityGoal: makeActivityGoal({ is_met: true }),
    });
    expect(status.workStatus).toBe('working');
    expect(status.isActivityGoalMet).toBe(true);
    expect(status.isDoneForEpoch).toBe(false);
  });

  it('is goal-pending when rewards are earned but the goal is not met', () => {
    expect(
      setup({
        isEpochTargetMet: true,
        activityGoal: makeActivityGoal({ is_met: false }),
      }),
    ).toEqual({
      isEpochTargetMet: true,
      isActivityGoalMet: false,
      isDoneForEpoch: false,
      workStatus: 'goal-pending',
    });
  });

  it('is goal-pending when the met block is from an earlier epoch', () => {
    const status = setup({
      isEpochTargetMet: true,
      activityGoal: makeActivityGoal({
        is_met: true,
        period_start: DEFAULT_TS_CHECKPOINT - 1,
      }),
    });
    expect(status.workStatus).toBe('goal-pending');
    expect(status.isDoneForEpoch).toBe(false);
  });

  it('is standby when both the staking KPI and the goal are met', () => {
    expect(
      setup({
        isEpochTargetMet: true,
        activityGoal: makeActivityGoal({ is_met: true }),
      }),
    ).toEqual({
      isEpochTargetMet: true,
      isActivityGoalMet: true,
      isDoneForEpoch: true,
      workStatus: 'standby',
    });
  });

  it('falls back to standby on the staking KPI alone for older agent builds', () => {
    const status = setup({ isEpochTargetMet: true, activityGoal: null });
    expect(status.workStatus).toBe('standby');
    expect(status.isDoneForEpoch).toBe(true);
    expect(status.isActivityGoalMet).toBeUndefined();
  });

  it('counts an unreadable report as goal not met', () => {
    const status = setup({ isEpochTargetMet: true, isUnavailable: true });
    expect(status.workStatus).toBe('goal-pending');
    expect(status.isDoneForEpoch).toBe(false);
  });

  it('is undefined while the goal is loading after rewards are earned', () => {
    const status = setup({ isEpochTargetMet: true, isLoading: true });
    expect(status.workStatus).toBeUndefined();
    expect(status.isDoneForEpoch).toBeUndefined();
  });

  it('is undefined while the staking side is loading', () => {
    const status = setup({ isEpochTargetMet: undefined });
    expect(status.workStatus).toBeUndefined();
    expect(status.isDoneForEpoch).toBeUndefined();
  });

  it('is undefined without staking details (no-staking agents)', () => {
    const status = setup({ isEpochTargetMet: true, hasRewardsDetails: false });
    expect(status.workStatus).toBeUndefined();
    expect(status.isDoneForEpoch).toBeUndefined();
  });
});
