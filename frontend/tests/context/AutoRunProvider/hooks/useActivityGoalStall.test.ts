import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { ACTIVITY_GOAL_STALL_SECONDS } from '../../../../context/AutoRunProvider/constants';
import {
  ActivityGoalObservation,
  useActivityGoalStall,
} from '../../../../context/AutoRunProvider/hooks/useActivityGoalStall';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_TS_CHECKPOINT,
  makeActivityGoal,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../../../helpers/factories';

const scTrader = DEFAULT_SERVICE_CONFIG_ID;
const scOptimus = MOCK_SERVICE_CONFIG_ID_2;
const STALL_MS = ACTIVITY_GOAL_STALL_SECONDS * 1000;
const START_MS = (DEFAULT_TS_CHECKPOINT + 3_600) * 1000;

const observe = (
  overrides: Partial<ActivityGoalObservation> = {},
): ActivityGoalObservation => ({
  isRunning: true,
  epochTargetMet: true,
  epochExpired: false,
  tsCheckpoint: DEFAULT_TS_CHECKPOINT,
  goal: makeActivityGoal({ progress: 0, target: 8 }),
  ...overrides,
});

type StallProps = Parameters<typeof useActivityGoalStall>[0];

const renderStall = () =>
  renderHook((hookProps: StallProps) => useActivityGoalStall(hookProps), {
    initialProps: {
      enabled: true,
      runningServiceConfigId: scTrader,
      orderedIncludedInstances: [scTrader, scOptimus],
      logMessage: jest.fn(),
    },
  });

const advance = (ms: number) => jest.setSystemTime(Date.now() + ms);

describe('useActivityGoalStall', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(START_MS);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('trackActivityGoal', () => {
    it('reports a stall only once a full stall period passes without progress', () => {
      const { result } = renderStall();

      expect(result.current.trackActivityGoal(scTrader, observe())).toBe(false);
      advance(STALL_MS - 1);
      expect(result.current.trackActivityGoal(scTrader, observe())).toBe(false);
      advance(1);
      expect(result.current.trackActivityGoal(scTrader, observe())).toBe(true);
      expect(result.current.isActivityGoalStalled(scTrader)).toBe(true);
    });

    it.each([
      ['progress', { progress: 1 }],
      ['target', { target: 4 }],
      ['period_start', { period_start: DEFAULT_TS_CHECKPOINT + 60 }],
    ])('restarts the clock when %s changes', (_, change) => {
      const { result } = renderStall();
      result.current.trackActivityGoal(scTrader, observe());
      advance(STALL_MS);

      const changed = makeActivityGoal({ progress: 0, target: 8, ...change });
      expect(
        result.current.trackActivityGoal(scTrader, observe({ goal: changed })),
      ).toBe(false);
      advance(STALL_MS - 1);
      expect(
        result.current.trackActivityGoal(scTrader, observe({ goal: changed })),
      ).toBe(false);
    });

    it('ignores updated_at, which the agent rewrites whether or not it progressed', () => {
      const { result } = renderStall();
      result.current.trackActivityGoal(
        scTrader,
        observe({ goal: makeActivityGoal({ updated_at: 1 }) }),
      );
      advance(STALL_MS);
      expect(
        result.current.trackActivityGoal(
          scTrader,
          observe({ goal: makeActivityGoal({ updated_at: 2 }) }),
        ),
      ).toBe(true);
    });

    it.each<[string, Partial<ActivityGoalObservation>]>([
      ['not running', { isRunning: false }],
      ['before the staking KPI is met', { epochTargetMet: false }],
      ['once the epoch expired', { epochExpired: true }],
      ['without a block', { goal: null }],
      ['with a met goal', { goal: makeActivityGoal({ is_met: true }) }],
      [
        'with a block from an earlier epoch',
        { goal: makeActivityGoal({ period_start: DEFAULT_TS_CHECKPOINT - 1 }) },
      ],
    ])('does not count time %s', (_, overrides) => {
      const { result } = renderStall();
      result.current.trackActivityGoal(scTrader, observe());
      result.current.trackActivityGoal(scTrader, observe(overrides));
      advance(STALL_MS);

      expect(result.current.isActivityGoalStalled(scTrader)).toBe(false);
      // Watching again starts from scratch.
      expect(result.current.trackActivityGoal(scTrader, observe())).toBe(false);
    });

    it('keeps the clock running through an unreadable block', () => {
      const { result } = renderStall();
      result.current.trackActivityGoal(scTrader, observe());
      advance(STALL_MS);

      expect(
        result.current.trackActivityGoal(
          scTrader,
          observe({ goal: undefined }),
        ),
      ).toBe(false);
      expect(result.current.isActivityGoalStalled(scTrader)).toBe(true);
    });
  });

  describe('deferring a stalled instance', () => {
    const stallAndDefer = () => {
      const hook = renderStall();
      hook.result.current.trackActivityGoal(scTrader, observe());
      advance(STALL_MS);
      act(() => {
        hook.result.current.deferStalledInstance(scTrader);
      });
      return hook;
    };

    it('exposes the deferred instance with its goal progress', () => {
      const { result } = stallAndDefer();

      expect(result.current.isActivityGoalDeferred(scTrader)).toBe(true);
      expect(result.current.isActivityGoalStalled(scTrader)).toBe(false);
      expect(result.current.stalledInstances).toEqual({
        [scTrader]: {
          progress: 0,
          target: 8,
          unit: 'trades',
          periodStart: DEFAULT_TS_CHECKPOINT,
        },
      });
    });

    it('keeps reading as stalled while not running in the same epoch', () => {
      const { result } = stallAndDefer();
      expect(
        result.current.trackActivityGoal(
          scTrader,
          observe({ isRunning: false, goal: undefined }),
        ),
      ).toBe(true);
    });

    it.each<[string, Partial<ActivityGoalObservation>]>([
      [
        'the checkpoint moves',
        { tsCheckpoint: DEFAULT_TS_CHECKPOINT + 86_400 },
      ],
      ['the staking KPI resets', { epochTargetMet: false }],
      ['the epoch expires', { epochExpired: true }],
    ])('is released when %s', (_, overrides) => {
      const { result } = stallAndDefer();
      let isStalled: boolean | undefined;
      act(() => {
        isStalled = result.current.trackActivityGoal(
          scTrader,
          observe({ isRunning: false, ...overrides }),
        );
      });
      expect(isStalled).toBe(false);
      expect(result.current.isActivityGoalDeferred(scTrader)).toBe(false);
      expect(result.current.stalledInstances).toEqual({});
    });

    it('is released when Auto-run starts it again, with a fresh clock', () => {
      const { result } = stallAndDefer();
      act(() => {
        result.current.releaseOnStart(scTrader);
      });

      expect(result.current.stalledInstances).toEqual({});
      expect(result.current.trackActivityGoal(scTrader, observe())).toBe(false);
    });

    it('is released when it runs again, e.g. started by hand', () => {
      const { result, rerender } = stallAndDefer();
      rerender({
        enabled: true,
        runningServiceConfigId: scOptimus,
        orderedIncludedInstances: [scTrader, scOptimus],
        logMessage: jest.fn(),
      });
      expect(result.current.isActivityGoalDeferred(scTrader)).toBe(true);

      rerender({
        enabled: true,
        runningServiceConfigId: scTrader,
        orderedIncludedInstances: [scTrader, scOptimus],
        logMessage: jest.fn(),
      });
      expect(result.current.isActivityGoalDeferred(scTrader)).toBe(false);
    });

    it('is forgotten when the user excludes it from Auto-run', () => {
      const { result, rerender } = stallAndDefer();
      rerender({
        enabled: true,
        runningServiceConfigId: scOptimus,
        orderedIncludedInstances: [scOptimus],
        logMessage: jest.fn(),
      });
      expect(result.current.stalledInstances).toEqual({});
      expect(result.current.isActivityGoalDeferred(scTrader)).toBe(false);
    });

    it('is forgotten when Auto-run is turned off', () => {
      const { result, rerender } = stallAndDefer();
      rerender({
        enabled: false,
        runningServiceConfigId: null,
        orderedIncludedInstances: [scTrader, scOptimus],
        logMessage: jest.fn(),
      });
      expect(result.current.stalledInstances).toEqual({});
      expect(result.current.isActivityGoalDeferred(scTrader)).toBe(false);
    });
  });

  it('gives a stalled instance that keeps the slot a fresh stall period', () => {
    const { result } = renderStall();
    result.current.trackActivityGoal(scTrader, observe());
    advance(STALL_MS);
    result.current.restartActivityGoalStallClock(scTrader);

    expect(result.current.isActivityGoalStalled(scTrader)).toBe(false);
    expect(result.current.trackActivityGoal(scTrader, observe())).toBe(false);
    advance(STALL_MS);
    expect(result.current.trackActivityGoal(scTrader, observe())).toBe(true);
  });

  it('stops watching an instance once another one runs', () => {
    const { result, rerender } = renderStall();
    result.current.trackActivityGoal(scTrader, observe());
    advance(STALL_MS);
    rerender({
      enabled: true,
      runningServiceConfigId: scOptimus,
      orderedIncludedInstances: [scTrader, scOptimus],
      logMessage: jest.fn(),
    });
    expect(result.current.isActivityGoalStalled(scTrader)).toBe(false);
  });
});
