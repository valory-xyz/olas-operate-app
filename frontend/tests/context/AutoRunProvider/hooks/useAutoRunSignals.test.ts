import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AgentMap, AgentType } from '../../../../constants/agent';
import { MiddlewareDeploymentStatusMap } from '../../../../constants/deployment';
import {
  ACTIVITY_GOAL_STALL_SECONDS,
  AGENT_SELECTION_WAIT_TIMEOUT_SECONDS,
  REWARDS_POLL_SECONDS,
} from '../../../../context/AutoRunProvider/constants';
import { useAutoRunSignals } from '../../../../context/AutoRunProvider/hooks/useAutoRunSignals';
import {
  RewardSnapshot,
  StallClock,
} from '../../../../context/AutoRunProvider/types';
import { useBalanceAndRefillRequirementsContext } from '../../../../hooks';
import { ServicesService } from '../../../../service/Services';
import * as delayModule from '../../../../utils/delay';
import {
  DEFAULT_LIVENESS_PERIOD_S,
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  DEFAULT_TS_CHECKPOINT,
  makeActivityGoal,
  makeStakingRewardsInfo,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../../../helpers/factories';

const BALANCE_STALENESS_MS = REWARDS_POLL_SECONDS * 1000;
const BALANCES_WAIT_TIMEOUT_SECONDS = AGENT_SELECTION_WAIT_TIMEOUT_SECONDS * 3;

jest.mock('../../../../hooks', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn(),
}));
jest.mock('../../../../utils/delay', () =>
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../../helpers/autoRunMocks').delayMockFactory(),
);
jest.mock('../../../../service/Services', () => ({
  ServicesService: {
    getDeployment: jest.fn(),
  },
}));

const mockUseBalanceContext =
  useBalanceAndRefillRequirementsContext as jest.MockedFunction<
    typeof useBalanceAndRefillRequirementsContext
  >;
const mockSleepAwareDelay = delayModule.sleepAwareDelay as jest.Mock;
const mockGetDeployment = ServicesService.getDeployment as jest.Mock;

// Mid-epoch: one hour after the default checkpoint, well inside the liveness period.
const NOW_MS = (DEFAULT_TS_CHECKPOINT + 3600) * 1000;
const NEXT_TS_CHECKPOINT = DEFAULT_TS_CHECKPOINT + DEFAULT_LIVENESS_PERIOD_S;

const { tsCheckpoint: DEFAULT_EPOCH_TS, livenessPeriod: DEFAULT_LIVENESS } =
  makeStakingRewardsInfo();
const DEFAULT_REWARDS_EPOCH = {
  tsCheckpoint: DEFAULT_EPOCH_TS,
  livenessPeriod: DEFAULT_LIVENESS,
};

const makeRewardSnapshot = (
  overrides: Partial<RewardSnapshot> = {},
): RewardSnapshot => ({
  done: false,
  readAt: NOW_MS,
  stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
  tsCheckpoint: DEFAULT_TS_CHECKPOINT,
  livenessPeriod: DEFAULT_LIVENESS,
  goalTarget: null,
  goalPeriodStart: null,
  ...overrides,
});

const makeStallClock = (overrides: Partial<StallClock> = {}): StallClock => ({
  since: NOW_MS,
  progress: 3,
  target: 8,
  periodStart: DEFAULT_TS_CHECKPOINT,
  ...overrides,
});

type HookParams = Parameters<typeof useAutoRunSignals>[0];

const makeHookParams = (overrides: Partial<HookParams> = {}) => ({
  enabled: true,
  runningAgentType: null as AgentType | null,
  runningServiceConfigId: null as string | null,
  isSelectedAgentDetailsLoading: false,
  isSelectedDoneForEpoch: undefined as boolean | undefined,
  isSelectedNoStakingAgent: false,
  isEpochExpired: false,
  selectedStakingProgramId:
    DEFAULT_STAKING_PROGRAM_ID as HookParams['selectedStakingProgramId'],
  selectedRewardsEpoch:
    DEFAULT_REWARDS_EPOCH as HookParams['selectedRewardsEpoch'],
  selectedActivityGoal: undefined as HookParams['selectedActivityGoal'],
  selectedAgentType: AgentMap.PredictTrader,
  selectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID as string | null,
  logMessage: jest.fn(),
  ...overrides,
});

describe('useAutoRunSignals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW_MS);
    mockUseBalanceContext.mockReturnValue({
      isBalancesAndFundingRequirementsLoadingForAllServices: false,
      isBalancesAndFundingRequirementsReadyForAllServices: true,
      refetch: jest.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useBalanceAndRefillRequirementsContext>);
    mockSleepAwareDelay.mockResolvedValue(true);
    // Default: deployment not active — individual tests override per case.
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.BUILT,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('syncs enabledRef with enabled prop', () => {
    const params = makeHookParams({ enabled: true });
    const { result, rerender } = renderHook(
      (props) => useAutoRunSignals(props),
      { initialProps: params },
    );
    expect(result.current.enabledRef.current).toBe(true);

    rerender({ ...params, enabled: false });
    expect(result.current.enabledRef.current).toBe(false);
  });

  it('syncs runningServiceConfigIdRef with runningServiceConfigId prop', () => {
    const params = makeHookParams({ runningServiceConfigId: null });
    const { result, rerender } = renderHook(
      (props) => useAutoRunSignals(props),
      { initialProps: params },
    );
    expect(result.current.runningServiceConfigIdRef.current).toBeNull();

    rerender({
      ...params,
      runningServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
    });
    expect(result.current.runningServiceConfigIdRef.current).toBe(
      DEFAULT_SERVICE_CONFIG_ID,
    );
  });

  describe('selected-instance snapshot', () => {
    it('writes a full snapshot of the selected instance read', () => {
      const params = makeHookParams({
        isSelectedDoneForEpoch: true,
        selectedActivityGoal: makeActivityGoal({
          target: 8,
          period_start: DEFAULT_TS_CHECKPOINT,
        }),
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      expect(
        result.current.getRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID),
      ).toEqual({
        done: true,
        readAt: NOW_MS,
        stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
        tsCheckpoint: DEFAULT_TS_CHECKPOINT,
        livenessPeriod: DEFAULT_LIVENESS,
        goalTarget: 8,
        goalPeriodStart: DEFAULT_TS_CHECKPOINT,
      });
    });

    it('stores null goal fields when the selected instance has no activity goal', () => {
      const params = makeHookParams({
        isSelectedDoneForEpoch: false,
        selectedActivityGoal: null,
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      expect(
        result.current.getRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID),
      ).toMatchObject({ done: false, goalTarget: null, goalPeriodStart: null });
    });

    it('rewrites the snapshot with a fresh readAt when isSelectedDoneForEpoch changes', () => {
      const params = makeHookParams({ isSelectedDoneForEpoch: false });
      const { result, rerender } = renderHook(
        (props) => useAutoRunSignals(props),
        { initialProps: params },
      );
      expect(
        result.current.getRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID)?.done,
      ).toBe(false);

      jest.setSystemTime(NOW_MS + 5_000);
      rerender({ ...params, isSelectedDoneForEpoch: true });

      expect(
        result.current.getRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID),
      ).toMatchObject({ done: true, readAt: NOW_MS + 5_000 });
    });

    it('writes done=false when the epoch has expired', () => {
      const params = makeHookParams({
        isSelectedDoneForEpoch: true,
        isEpochExpired: true,
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      expect(
        result.current.getRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID)?.done,
      ).toBe(false);
    });

    it('keeps the previous snapshot when isSelectedDoneForEpoch becomes unknown', () => {
      const params = makeHookParams({ isSelectedDoneForEpoch: true });
      const { result, rerender } = renderHook(
        (props) => useAutoRunSignals(props),
        { initialProps: params },
      );
      const previous = result.current.getRewardSnapshot(
        DEFAULT_SERVICE_CONFIG_ID,
      );

      jest.setSystemTime(NOW_MS + 5_000);
      rerender({ ...params, isSelectedDoneForEpoch: undefined });

      expect(result.current.getRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        previous,
      );
      expect(previous).toMatchObject({ done: true, readAt: NOW_MS });
    });

    it('skips writing when the staking program is missing', () => {
      const params = makeHookParams({
        isSelectedDoneForEpoch: true,
        selectedStakingProgramId: undefined,
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      expect(
        result.current.getRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID),
      ).toBeUndefined();
    });

    it('skips writing when the epoch is missing', () => {
      const params = makeHookParams({
        isSelectedDoneForEpoch: true,
        selectedRewardsEpoch: undefined,
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      expect(
        result.current.getRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID),
      ).toBeUndefined();
    });

    it('does not overwrite the snapshot of a selected no-staking agent', () => {
      const params = makeHookParams({
        isSelectedDoneForEpoch: false,
        isSelectedNoStakingAgent: true,
      });
      const { result, rerender } = renderHook(
        (props) => useAutoRunSignals(props),
        { initialProps: params },
      );
      const stored = makeRewardSnapshot({ done: true, tsCheckpoint: 0 });
      act(() => {
        result.current.setRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID, stored);
      });

      rerender({ ...params, isEpochExpired: true });

      expect(result.current.getRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        stored,
      );
    });
  });

  it('setRewardSnapshot stores the snapshot and bumps rewardsTick', () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunSignals(params));
    const initialTick = result.current.rewardsTick;
    const snapshot = makeRewardSnapshot({ done: true });

    act(() => {
      result.current.setRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID, snapshot);
    });

    expect(result.current.getRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID)).toBe(
      snapshot,
    );
    expect(result.current.rewardsTick).toBe(initialTick + 1);
  });

  describe('stall helpers', () => {
    const STALL_MS = ACTIVITY_GOAL_STALL_SECONDS * 1000;

    it('isStalled is false without a clock', () => {
      const { result } = renderHook(() => useAutoRunSignals(makeHookParams()));
      expect(result.current.isStalled(DEFAULT_SERVICE_CONFIG_ID)).toBe(false);
    });

    it('isStalled is false before the stall period has elapsed', () => {
      const { result } = renderHook(() => useAutoRunSignals(makeHookParams()));
      result.current.stallClockRef.current[DEFAULT_SERVICE_CONFIG_ID] =
        makeStallClock({ since: NOW_MS - STALL_MS + 1 });

      expect(result.current.isStalled(DEFAULT_SERVICE_CONFIG_ID)).toBe(false);
    });

    it('isStalled is true once the stall period has elapsed', () => {
      const { result } = renderHook(() => useAutoRunSignals(makeHookParams()));
      result.current.stallClockRef.current[DEFAULT_SERVICE_CONFIG_ID] =
        makeStallClock({ since: NOW_MS - STALL_MS });

      expect(result.current.isStalled(DEFAULT_SERVICE_CONFIG_ID)).toBe(true);
    });

    it('restartStallClock restarts an existing clock from now', () => {
      const { result } = renderHook(() => useAutoRunSignals(makeHookParams()));
      result.current.stallClockRef.current[DEFAULT_SERVICE_CONFIG_ID] =
        makeStallClock({ since: NOW_MS - STALL_MS });

      result.current.restartStallClock(DEFAULT_SERVICE_CONFIG_ID);

      expect(
        result.current.stallClockRef.current[DEFAULT_SERVICE_CONFIG_ID],
      ).toEqual(makeStallClock({ since: NOW_MS }));
      expect(result.current.isStalled(DEFAULT_SERVICE_CONFIG_ID)).toBe(false);
    });

    it('restartStallClock does not create a clock', () => {
      const { result } = renderHook(() => useAutoRunSignals(makeHookParams()));

      result.current.restartStallClock(DEFAULT_SERVICE_CONFIG_ID);

      expect(
        result.current.stallClockRef.current[DEFAULT_SERVICE_CONFIG_ID],
      ).toBeUndefined();
    });

    it('deferStalled deletes the clock and defers for the snapshot epoch', () => {
      const params = makeHookParams({ isSelectedDoneForEpoch: false });
      const { result } = renderHook(() => useAutoRunSignals(params));
      result.current.stallClockRef.current[DEFAULT_SERVICE_CONFIG_ID] =
        makeStallClock({ since: NOW_MS - STALL_MS });

      result.current.deferStalled(DEFAULT_SERVICE_CONFIG_ID);

      expect(
        result.current.stallClockRef.current[DEFAULT_SERVICE_CONFIG_ID],
      ).toBeUndefined();
      expect(result.current.isStallDeferred(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        true,
      );
    });

    it('isStallDeferred is false for an instance never deferred', () => {
      const { result } = renderHook(() => useAutoRunSignals(makeHookParams()));
      expect(result.current.isStallDeferred(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        false,
      );
    });

    it('isStallDeferred is true when no snapshot exists', () => {
      const { result } = renderHook(() => useAutoRunSignals(makeHookParams()));

      result.current.deferStalled(DEFAULT_SERVICE_CONFIG_ID);

      expect(result.current.isStallDeferred(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        true,
      );
    });

    it('isStallDeferred stays true across reads in the same epoch', () => {
      const { result } = renderHook(() => useAutoRunSignals(makeHookParams()));
      act(() => {
        result.current.setRewardSnapshot(
          DEFAULT_SERVICE_CONFIG_ID,
          makeRewardSnapshot(),
        );
      });
      result.current.deferStalled(DEFAULT_SERVICE_CONFIG_ID);

      act(() => {
        result.current.setRewardSnapshot(
          DEFAULT_SERVICE_CONFIG_ID,
          makeRewardSnapshot({ readAt: NOW_MS + 60_000 }),
        );
      });

      expect(result.current.isStallDeferred(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        true,
      );
    });

    it('isStallDeferred drops the deferral once a new epoch is read', () => {
      const { result } = renderHook(() => useAutoRunSignals(makeHookParams()));
      act(() => {
        result.current.setRewardSnapshot(
          DEFAULT_SERVICE_CONFIG_ID,
          makeRewardSnapshot(),
        );
      });
      result.current.deferStalled(DEFAULT_SERVICE_CONFIG_ID);

      act(() => {
        result.current.setRewardSnapshot(
          DEFAULT_SERVICE_CONFIG_ID,
          makeRewardSnapshot({ tsCheckpoint: NEXT_TS_CHECKPOINT }),
        );
      });
      expect(result.current.isStallDeferred(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        false,
      );

      // Dropped, not just masked: back to the deferral's epoch it stays gone.
      act(() => {
        result.current.setRewardSnapshot(
          DEFAULT_SERVICE_CONFIG_ID,
          makeRewardSnapshot(),
        );
      });
      expect(result.current.isStallDeferred(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        false,
      );
    });

    it('isStallDeferred drops the deferral once the snapshot epoch has expired', () => {
      const { result } = renderHook(() => useAutoRunSignals(makeHookParams()));
      act(() => {
        result.current.setRewardSnapshot(
          DEFAULT_SERVICE_CONFIG_ID,
          makeRewardSnapshot(),
        );
      });
      result.current.deferStalled(DEFAULT_SERVICE_CONFIG_ID);

      jest.setSystemTime(NEXT_TS_CHECKPOINT * 1000);
      expect(result.current.isStallDeferred(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        false,
      );

      jest.setSystemTime(NOW_MS);
      expect(result.current.isStallDeferred(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        false,
      );
    });

    it('clearStallDeferral ends the deferral', () => {
      const { result } = renderHook(() => useAutoRunSignals(makeHookParams()));
      result.current.deferStalled(DEFAULT_SERVICE_CONFIG_ID);

      result.current.clearStallDeferral(DEFAULT_SERVICE_CONFIG_ID);

      expect(result.current.isStallDeferred(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        false,
      );
    });

    it.each([
      ['stops', null],
      ['hands over to another instance', MOCK_SERVICE_CONFIG_ID_2],
    ])(
      'drops the stall clock when the running instance %s',
      (_, nextRunningId) => {
        const params = makeHookParams({
          enabled: true,
          runningServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        });
        const { result, rerender } = renderHook(
          (props) => useAutoRunSignals(props),
          { initialProps: params },
        );
        result.current.stallClockRef.current[DEFAULT_SERVICE_CONFIG_ID] =
          makeStallClock({ since: NOW_MS - STALL_MS });

        rerender({ ...params, runningServiceConfigId: nextRunningId });
        rerender({
          ...params,
          runningServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        });

        expect(result.current.stallClockRef.current).toEqual({});
        expect(result.current.isStalled(DEFAULT_SERVICE_CONFIG_ID)).toBe(false);
      },
    );

    it('disabling auto-run clears stall clocks and deferrals', () => {
      const params = makeHookParams({ enabled: true });
      const { result, rerender } = renderHook(
        (props) => useAutoRunSignals(props),
        { initialProps: params },
      );
      result.current.stallClockRef.current[MOCK_SERVICE_CONFIG_ID_2] =
        makeStallClock({ since: NOW_MS - STALL_MS });
      result.current.deferStalled(DEFAULT_SERVICE_CONFIG_ID);

      rerender({ ...params, enabled: false });

      expect(result.current.stallClockRef.current).toEqual({});
      expect(result.current.isStalled(MOCK_SERVICE_CONFIG_ID_2)).toBe(false);
      expect(result.current.isStallDeferred(DEFAULT_SERVICE_CONFIG_ID)).toBe(
        false,
      );
    });
  });

  it('getBalancesStatus returns ready/loading from context', () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunSignals(params));
    expect(result.current.getBalancesStatus()).toEqual({
      ready: true,
      loading: false,
    });
  });

  describe('scheduleNextScan', () => {
    it('increments scanTick after delay', async () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunSignals(params));
      const initialTick = result.current.scanTick;

      act(() => {
        result.current.scheduleNextScan(10);
      });
      expect(result.current.hasScheduledScan()).toBe(true);

      act(() => {
        jest.advanceTimersByTime(10_000);
      });
      expect(result.current.scanTick).toBe(initialTick + 1);
      expect(result.current.hasScheduledScan()).toBe(false);
    });

    it('does not schedule when disabled', () => {
      const params = makeHookParams({ enabled: false });
      const { result } = renderHook(() => useAutoRunSignals(params));

      act(() => {
        result.current.scheduleNextScan(10);
      });
      expect(result.current.hasScheduledScan()).toBe(false);
    });

    it('replaces previous scheduled scan', () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunSignals(params));
      const initialTick = result.current.scanTick;

      act(() => {
        result.current.scheduleNextScan(100);
      });
      act(() => {
        result.current.scheduleNextScan(5);
      });

      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      expect(result.current.scanTick).toBe(initialTick + 1);
    });

    it('clears scheduled scan on disable', () => {
      const params = makeHookParams({ enabled: true });
      const { result, rerender } = renderHook(
        (props) => useAutoRunSignals(props),
        { initialProps: params },
      );

      act(() => {
        result.current.scheduleNextScan(100);
      });
      expect(result.current.hasScheduledScan()).toBe(true);

      rerender({ ...params, enabled: false });
      expect(result.current.hasScheduledScan()).toBe(false);
    });
  });

  describe('waitForInstanceSelection', () => {
    it('returns true immediately when instance is already selected', async () => {
      const params = makeHookParams({
        selectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        isSelectedAgentDetailsLoading: false,
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForInstanceSelection(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
      expect(ok).toBe(true);
    });

    it('returns false when disabled', async () => {
      const params = makeHookParams({ enabled: false });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForInstanceSelection(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
      expect(ok).toBe(false);
    });

    it('logs timeout message with serviceConfigId when selection wait times out', async () => {
      const logMessage = jest.fn();
      const params = makeHookParams({
        selectedServiceConfigId: 'sc-other',
        isSelectedAgentDetailsLoading: true,
        logMessage,
      });
      mockSleepAwareDelay.mockImplementation(async () => {
        jest.advanceTimersByTime(
          AGENT_SELECTION_WAIT_TIMEOUT_SECONDS * 1000 + 1,
        );
        return true;
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForInstanceSelection(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
      expect(ok).toBe(false);
      expect(logMessage).toHaveBeenCalledWith(
        `selection wait timeout: ${DEFAULT_SERVICE_CONFIG_ID}`,
      );
    });
  });

  describe('waitForBalancesReady', () => {
    it('returns true immediately when balances are ready and fresh', async () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForBalancesReady();
      });
      expect(ok).toBe(true);
    });

    it('triggers refetch and logs when balances are stale', async () => {
      const logMessage = jest.fn();
      const refetchMock = jest.fn().mockResolvedValue(undefined);
      mockUseBalanceContext.mockReturnValue({
        isBalancesAndFundingRequirementsLoadingForAllServices: false,
        isBalancesAndFundingRequirementsReadyForAllServices: true,
        refetch: refetchMock,
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);

      const params = makeHookParams({ logMessage });
      const { result } = renderHook(() => useAutoRunSignals(params));

      jest.advanceTimersByTime(BALANCE_STALENESS_MS + 1);

      let callCount = 0;
      mockSleepAwareDelay.mockImplementation(async () => {
        callCount += 1;
        if (callCount === 1) {
          // Simulate balances becoming fresh on the next iteration
        }
        return true;
      });

      await act(async () => {
        await result.current.waitForBalancesReady();
      });

      expect(logMessage).toHaveBeenCalledWith(
        'balances stale, triggering refetch',
      );
      expect(refetchMock).toHaveBeenCalled();
    });

    it('logs error when refetch fails', async () => {
      const logMessage = jest.fn();
      const refetchError = new Error('network failure');
      const refetchMock = jest.fn().mockRejectedValue(refetchError);
      mockUseBalanceContext.mockReturnValue({
        isBalancesAndFundingRequirementsLoadingForAllServices: false,
        isBalancesAndFundingRequirementsReadyForAllServices: true,
        refetch: refetchMock,
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);

      const params = makeHookParams({ logMessage });
      const { result } = renderHook(() => useAutoRunSignals(params));

      jest.advanceTimersByTime(BALANCE_STALENESS_MS + 1);

      mockSleepAwareDelay.mockImplementation(async () => {
        jest.advanceTimersByTime(BALANCES_WAIT_TIMEOUT_SECONDS * 1000 + 1);
        return true;
      });

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForBalancesReady();
      });
      expect(ok).toBe(false);
      expect(logMessage).toHaveBeenCalledWith(
        `balances refetch failed: ${refetchError}`,
      );
    });

    it('returns false when balances wait times out', async () => {
      const logMessage = jest.fn();
      mockUseBalanceContext.mockReturnValue({
        isBalancesAndFundingRequirementsLoadingForAllServices: true,
        isBalancesAndFundingRequirementsReadyForAllServices: false,
        refetch: jest.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);

      const params = makeHookParams({ logMessage });
      const { result } = renderHook(() => useAutoRunSignals(params));

      mockSleepAwareDelay.mockImplementation(async () => {
        jest.advanceTimersByTime(BALANCES_WAIT_TIMEOUT_SECONDS * 1000 + 1);
        return true;
      });

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForBalancesReady();
      });
      expect(ok).toBe(false);
      expect(logMessage).toHaveBeenCalledWith('balances wait timeout');
    });

    it('returns false when sleepAwareDelay returns false', async () => {
      mockUseBalanceContext.mockReturnValue({
        isBalancesAndFundingRequirementsLoadingForAllServices: true,
        isBalancesAndFundingRequirementsReadyForAllServices: false,
        refetch: jest.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);

      mockSleepAwareDelay.mockResolvedValue(false);
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForBalancesReady();
      });
      expect(ok).toBe(false);
    });
  });

  describe('waitForRunningInstance', () => {
    it('returns true when deployment is active immediately', async () => {
      mockGetDeployment.mockResolvedValue({
        status: MiddlewareDeploymentStatusMap.DEPLOYED,
      });
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForRunningInstance(
          DEFAULT_SERVICE_CONFIG_ID,
          10,
        );
      });
      expect(ok).toBe(true);
      expect(mockGetDeployment).toHaveBeenCalledWith(
        expect.objectContaining({ serviceConfigId: DEFAULT_SERVICE_CONFIG_ID }),
      );
    });

    it('returns true when deployment reports a transitional active state (DEPLOYING)', async () => {
      mockGetDeployment.mockResolvedValue({
        status: MiddlewareDeploymentStatusMap.DEPLOYING,
      });
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForRunningInstance(
          DEFAULT_SERVICE_CONFIG_ID,
          10,
        );
      });
      expect(ok).toBe(true);
    });

    it('does NOT treat STOPPING as running (a deployment mid-stop has not satisfied the start request)', async () => {
      // Time out the outer loop deterministically so the test finishes
      // without polling for the full timeoutSeconds budget.
      const realDateNow = Date.now;
      let elapsed = 0;
      Date.now = jest.fn(() => {
        elapsed += 11_000;
        return realDateNow() + elapsed;
      });
      mockGetDeployment.mockResolvedValue({
        status: MiddlewareDeploymentStatusMap.STOPPING,
      });
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForRunningInstance(
          DEFAULT_SERVICE_CONFIG_ID,
          10,
        );
      });
      expect(ok).toBe(false);
      Date.now = realDateNow;
    });

    it('returns true even when runningServiceConfigId ref points at a different agent (stale-ref regression)', async () => {
      // Simulates the rotation case from the second user bundle: ref still
      // points at the old agent, but the backend has the freshly-started
      // agent in an active state. Previously this returned false (timeout).
      mockGetDeployment.mockResolvedValue({
        status: MiddlewareDeploymentStatusMap.DEPLOYED,
      });
      const params = makeHookParams({
        runningServiceConfigId: 'sc-some-other-agent',
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForRunningInstance(
          DEFAULT_SERVICE_CONFIG_ID,
          10,
        );
      });
      expect(ok).toBe(true);
    });

    it('returns false when sleep/wake interrupts', async () => {
      mockSleepAwareDelay.mockResolvedValue(false);
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForRunningInstance(
          DEFAULT_SERVICE_CONFIG_ID,
          10,
        );
      });
      expect(ok).toBe(false);
    });

    it('returns false and logs timeout when deployment never reaches active', async () => {
      const logMessage = jest.fn();
      const params = makeHookParams({ logMessage });
      const realDateNow = Date.now;
      let elapsed = 0;
      Date.now = jest.fn(() => {
        elapsed += 11_000;
        return realDateNow() + elapsed;
      });

      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForRunningInstance(
          DEFAULT_SERVICE_CONFIG_ID,
          10,
        );
      });
      expect(ok).toBe(false);
      expect(logMessage).toHaveBeenCalledWith(
        `running timeout: ${DEFAULT_SERVICE_CONFIG_ID}`,
      );
      Date.now = realDateNow;
    });

    it('keeps polling when getDeployment throws transiently, returns true once active', async () => {
      mockGetDeployment
        .mockRejectedValueOnce(new Error('network blip'))
        .mockResolvedValueOnce({
          status: MiddlewareDeploymentStatusMap.DEPLOYED,
        });
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForRunningInstance(
          DEFAULT_SERVICE_CONFIG_ID,
          10,
        );
      });
      expect(ok).toBe(true);
      expect(mockGetDeployment).toHaveBeenCalledTimes(2);
    });
  });

  describe('waitForBalancesReady — disabled mid-wait', () => {
    it('returns false when disabled while waiting for balances', async () => {
      mockUseBalanceContext.mockReturnValue({
        isBalancesAndFundingRequirementsLoadingForAllServices: true,
        isBalancesAndFundingRequirementsReadyForAllServices: false,
        refetch: jest.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);

      const params = makeHookParams({ enabled: false });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForBalancesReady();
      });
      expect(ok).toBe(false);
    });
  });

  describe('unmount cleanup', () => {
    it('clears pending scan timer on unmount', () => {
      const params = makeHookParams();
      const { result, unmount } = renderHook(() => useAutoRunSignals(params));

      act(() => {
        result.current.scheduleNextScan(100);
      });
      expect(result.current.hasScheduledScan()).toBe(true);

      unmount();
    });
  });
});
