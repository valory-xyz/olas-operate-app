import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AgentMap, AgentType } from '../../../../constants/agent';
import {
  AUTO_RUN_HEALTH_METRIC,
  COOLDOWN_SECONDS,
  RUNNING_AGENT_MAX_RUNTIME_SECONDS,
  RUNNING_AGENT_WATCHDOG_CHECK_SECONDS,
  SCAN_BLOCKED_DELAY_SECONDS,
  SCAN_ELIGIBLE_DELAY_SECONDS,
} from '../../../../context/AutoRunProvider/constants';
import { useAutoRunLifecycle } from '../../../../context/AutoRunProvider/hooks/useAutoRunLifecycle';
import * as delayModule from '../../../../utils/delay';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../../../helpers/factories';

jest.mock('../../../../utils/delay', () =>
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../../helpers/autoRunMocks').delayMockFactory(),
);
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunVerboseLogger',
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  () => require('../../../helpers/autoRunMocks').verboseLoggerMockFactory(),
);

const mockSleepAwareDelay = delayModule.sleepAwareDelay as jest.Mock;

const scTrader = DEFAULT_SERVICE_CONFIG_ID;
const scOptimus = MOCK_SERVICE_CONFIG_ID_2;

const makeHookParams = (
  overrides: Partial<Parameters<typeof useAutoRunLifecycle>[0]> = {},
) => ({
  // Default: disabled so effects don't fire unwanted async operations
  enabled: false,
  runningAgentType: null as AgentType | null,
  runningServiceConfigId: null as string | null,
  orderedIncludedInstances: [scTrader, scOptimus],
  enabledRef: { current: false },
  runningAgentTypeRef: { current: null as AgentType | null },
  runningServiceConfigIdRef: { current: null as string | null },
  lastRewardsEligibilityRef: {
    current: {} as Partial<Record<string, boolean | undefined>>,
  },
  scanTick: 0,
  rewardsTick: 0,
  scheduleNextScan: jest.fn(),
  hasScheduledScan: jest.fn().mockReturnValue(false),
  refreshRewardsEligibility: jest.fn().mockResolvedValue(false),
  getRewardSnapshot: jest.fn().mockReturnValue(false),
  getPreferredStartFrom: jest.fn().mockReturnValue(null),
  scanAndStartNext: jest.fn().mockResolvedValue({ started: false }),
  startSelectedAgentIfEligible: jest.fn().mockResolvedValue(false),
  stopAgentWithRecovery: jest.fn().mockResolvedValue(true),
  stopRetryBackoffUntilRef: {
    current: {} as Partial<Record<string, number>>,
  },
  recordMetric: jest.fn(),
  logMessage: jest.fn(),
  ...overrides,
});

describe('useAutoRunLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSleepAwareDelay.mockResolvedValue(true);
  });

  it('exposes stopCurrentRunningAgent', () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunLifecycle(params));
    expect(typeof result.current.stopCurrentRunningAgent).toBe('function');
  });

  describe('stopCurrentRunningAgent', () => {
    it('returns false when no running instance', async () => {
      const params = makeHookParams({ runningServiceConfigId: null });
      const { result } = renderHook(() => useAutoRunLifecycle(params));

      let stopped: boolean | undefined;
      await act(async () => {
        stopped = await result.current.stopCurrentRunningAgent();
      });
      expect(stopped).toBe(false);
    });

    it('delegates to stopAgentWithRecovery for running instance', async () => {
      const params = makeHookParams({
        runningServiceConfigId: scTrader,
      });
      const { result } = renderHook(() => useAutoRunLifecycle(params));

      await act(async () => {
        await result.current.stopCurrentRunningAgent();
      });
      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
    });
  });

  describe('stopRetryBackoffUntilRef cleanup', () => {
    it('clears backoff state when disabled', () => {
      const stopRetryBackoffUntilRef = {
        current: {
          [scTrader]: Date.now() + 60_000,
        } as Partial<Record<string, number>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        stopRetryBackoffUntilRef,
      });

      const { rerender } = renderHook((props) => useAutoRunLifecycle(props), {
        initialProps: params,
      });

      act(() => {
        rerender({ ...params, enabled: false, enabledRef: { current: false } });
      });
      expect(stopRetryBackoffUntilRef.current).toEqual({});
    });
  });

  describe('rotation flow', () => {
    it('triggers rotation on rewards false->true transition', async () => {
      const lastRewardsEligibilityRef = {
        current: {
          [scTrader]: false,
        } as Partial<Record<string, boolean | undefined>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        lastRewardsEligibilityRef,
        refreshRewardsEligibility: jest
          .fn()
          .mockImplementation(async (id: string) => id === scTrader),
        getRewardSnapshot: jest.fn().mockReturnValue(false),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
    });

    it('does not rotate when previousEligibility was already true', async () => {
      const lastRewardsEligibilityRef = {
        current: {
          [scTrader]: true,
        } as Partial<Record<string, boolean | undefined>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        lastRewardsEligibilityRef,
        refreshRewardsEligibility: jest.fn().mockResolvedValue(true),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
    });

    it('keeps running agent when all others confirmed earned and schedules blocked delay', async () => {
      const lastRewardsEligibilityRef = {
        current: {
          [scTrader]: false,
        } as Partial<Record<string, boolean | undefined>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        lastRewardsEligibilityRef,
        refreshRewardsEligibility: jest.fn().mockResolvedValue(true),
        getRewardSnapshot: jest.fn().mockReturnValue(true),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
    });

    it('proceeds with rotation when alternate rewards state is unknown (undefined)', async () => {
      // Stale-true override forwards unknown to scanner; rotation proceeds rather
      // than blocking. This is the fix to the original deadlock where undefined
      // was treated as earned.
      const lastRewardsEligibilityRef = {
        current: {
          [scTrader]: false,
        } as Partial<Record<string, boolean | undefined>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        lastRewardsEligibilityRef,
        refreshRewardsEligibility: jest
          .fn()
          .mockImplementation(async (id: string) =>
            id === scTrader ? true : undefined,
          ),
        getRewardSnapshot: jest
          .fn()
          .mockImplementation((id: string) =>
            id === scTrader ? false : undefined,
          ),
        stopAgentWithRecovery: jest.fn().mockResolvedValue(true),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
      expect(params.scanAndStartNext).toHaveBeenCalledWith(scTrader);
    });

    it('resets rewards guard and sets backoff on stop failure', async () => {
      const lastRewardsEligibilityRef = {
        current: {
          [scTrader]: false,
        } as Partial<Record<string, boolean | undefined>>,
      };
      const stopRetryBackoffUntilRef = {
        current: {} as Partial<Record<string, number>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        lastRewardsEligibilityRef,
        stopRetryBackoffUntilRef,
        refreshRewardsEligibility: jest
          .fn()
          .mockImplementation(async (id: string) =>
            id === scTrader ? true : false,
          ),
        getRewardSnapshot: jest.fn().mockReturnValue(false),
        stopAgentWithRecovery: jest.fn().mockResolvedValue(false),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(lastRewardsEligibilityRef.current[scTrader]).toBeUndefined();
      expect(stopRetryBackoffUntilRef.current[scTrader]).toBeGreaterThan(
        Date.now(),
      );
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
    });

    it('scans after successful stop and cooldown', async () => {
      const lastRewardsEligibilityRef = {
        current: {
          [scTrader]: false,
        } as Partial<Record<string, boolean | undefined>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        lastRewardsEligibilityRef,
        refreshRewardsEligibility: jest
          .fn()
          .mockImplementation(async (id: string) => id === scTrader),
        getRewardSnapshot: jest.fn().mockReturnValue(false),
        stopAgentWithRecovery: jest.fn().mockResolvedValue(true),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.stopAgentWithRecovery).toHaveBeenCalled();
      expect(params.scanAndStartNext).toHaveBeenCalledWith(scTrader);
      expect(params.recordMetric).toHaveBeenCalledWith('rotationsSucceeded');
      // P1 fix: rewards guard must be cleared so the next epoch can re-trigger rotation.
      // Without this reset, previousEligibility === true permanently blocks future rotations.
      expect(lastRewardsEligibilityRef.current[scTrader]).toBeUndefined();
    });
  });

  describe('startup when no agent running', () => {
    it('tries selected agent first then scans on initial enable', async () => {
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: null,
        runningServiceConfigId: null,
        runningAgentTypeRef: { current: null },
        runningServiceConfigIdRef: { current: null },
        startSelectedAgentIfEligible: jest.fn().mockResolvedValue(false),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.startSelectedAgentIfEligible).toHaveBeenCalled();
      expect(params.scanAndStartNext).toHaveBeenCalled();
    });

    it('does not scan when selected agent starts successfully', async () => {
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: null,
        runningServiceConfigId: null,
        runningAgentTypeRef: { current: null },
        runningServiceConfigIdRef: { current: null },
        startSelectedAgentIfEligible: jest.fn().mockResolvedValue(true),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.startSelectedAgentIfEligible).toHaveBeenCalled();
      expect(params.scanAndStartNext).not.toHaveBeenCalled();
    });
  });

  describe('runtime watchdog — force rotation after max runtime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const flushMicrotasks = async () => {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
    };

    it('calls stopAgentWithRecovery when agent exceeds max runtime', async () => {
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        refreshRewardsEligibility: jest.fn().mockResolvedValue(false),
        getRewardSnapshot: jest.fn().mockReturnValue(false),
        stopAgentWithRecovery: jest.fn().mockResolvedValue(true),
      });

      renderHook(() => useAutoRunLifecycle(params));

      await act(async () => {
        await flushMicrotasks();
      });

      (params.stopAgentWithRecovery as jest.Mock).mockClear();
      (params.refreshRewardsEligibility as jest.Mock).mockClear();

      await act(async () => {
        jest.advanceTimersByTime(
          RUNNING_AGENT_MAX_RUNTIME_SECONDS * 1000 +
            RUNNING_AGENT_WATCHDOG_CHECK_SECONDS * 1000,
        );
        await flushMicrotasks();
      });

      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
    });

    it('does not stop when all other agents are earned (force mode, no alternative)', async () => {
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        refreshRewardsEligibility: jest.fn().mockResolvedValue(true),
        getRewardSnapshot: jest.fn().mockReturnValue(true),
      });

      renderHook(() => useAutoRunLifecycle(params));

      await act(async () => {
        await flushMicrotasks();
      });

      (params.stopAgentWithRecovery as jest.Mock).mockClear();
      (params.scheduleNextScan as jest.Mock).mockClear();

      await act(async () => {
        jest.advanceTimersByTime(
          RUNNING_AGENT_MAX_RUNTIME_SECONDS * 1000 +
            RUNNING_AGENT_WATCHDOG_CHECK_SECONDS * 1000,
        );
        await flushMicrotasks();
      });

      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
    });
  });

  describe('resume path — agent stopped while auto-run enabled', () => {
    it('applies COOLDOWN_SECONDS delay and tries startSelectedAgentIfEligible', async () => {
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        startSelectedAgentIfEligible: jest.fn().mockResolvedValue(true),
      });

      const { rerender } = renderHook((props) => useAutoRunLifecycle(props), {
        initialProps: params,
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockSleepAwareDelay.mockClear();
      (params.startSelectedAgentIfEligible as jest.Mock).mockClear();
      (params.scanAndStartNext as jest.Mock).mockClear();

      const resumeParams = {
        ...params,
        runningAgentType: null,
        runningServiceConfigId: null,
        runningAgentTypeRef: { current: null },
        runningServiceConfigIdRef: { current: null },
      };

      rerender(resumeParams);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(mockSleepAwareDelay).toHaveBeenCalledWith(COOLDOWN_SECONDS);
      expect(params.startSelectedAgentIfEligible).toHaveBeenCalled();
    });

    it('falls through to scanAndStartNext when selected agent fails to start', async () => {
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        startSelectedAgentIfEligible: jest.fn().mockResolvedValue(false),
      });

      const { rerender } = renderHook((props) => useAutoRunLifecycle(props), {
        initialProps: params,
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockSleepAwareDelay.mockClear();
      (params.startSelectedAgentIfEligible as jest.Mock).mockClear();
      (params.scanAndStartNext as jest.Mock).mockClear();

      const resumeParams = {
        ...params,
        runningAgentType: null,
        runningServiceConfigId: null,
        runningAgentTypeRef: { current: null },
        runningServiceConfigIdRef: { current: null },
      };

      rerender(resumeParams);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(mockSleepAwareDelay).toHaveBeenCalledWith(COOLDOWN_SECONDS);
      expect(params.startSelectedAgentIfEligible).toHaveBeenCalled();
      expect(params.scanAndStartNext).toHaveBeenCalled();
    });
  });

  describe('rotation with no other agents (empty orderedIncludedInstances)', () => {
    it('schedules eligible delay when current agent is the only included instance', async () => {
      const lastRewardsEligibilityRef = {
        current: {
          [scTrader]: false,
        } as Partial<Record<string, boolean | undefined>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        lastRewardsEligibilityRef,
        orderedIncludedInstances: [scTrader],
        refreshRewardsEligibility: jest.fn().mockResolvedValue(true),
        getRewardSnapshot: jest.fn().mockReturnValue(false),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_ELIGIBLE_DELAY_SECONDS,
      );
      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
    });
  });

  describe('rewards check error handler', () => {
    it('logs error, records metric, resets guard, and schedules rescan when rewards check throws', async () => {
      const lastRewardsEligibilityRef = {
        current: {
          [scTrader]: false,
        } as Partial<Record<string, boolean | undefined>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        lastRewardsEligibilityRef,
        refreshRewardsEligibility: jest
          .fn()
          .mockRejectedValue(new Error('rewards fetch failed')),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.logMessage).toHaveBeenCalledWith(
        expect.stringContaining('rotation error'),
      );
      expect(params.recordMetric).toHaveBeenCalledWith(
        AUTO_RUN_HEALTH_METRIC.REWARDS_ERRORS,
      );
      expect(lastRewardsEligibilityRef.current[scTrader]).toBeUndefined();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
    });
  });

  describe('watchdog error handler', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const flushMicrotasks = async () => {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
    };

    it('logs error, records metric, resets guard, and schedules rescan when watchdog rotation throws', async () => {
      const lastRewardsEligibilityRef = {
        current: {} as Partial<Record<string, boolean | undefined>>,
      };
      const refreshMock = jest.fn().mockResolvedValue(false);
      const stopMock = jest.fn().mockRejectedValue(new Error('stop exploded'));
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        lastRewardsEligibilityRef,
        refreshRewardsEligibility: refreshMock,
        getRewardSnapshot: jest.fn().mockReturnValue(false),
        stopAgentWithRecovery: stopMock,
      });

      renderHook(() => useAutoRunLifecycle(params));

      await act(async () => {
        await flushMicrotasks();
      });

      (params.logMessage as jest.Mock).mockClear();
      (params.recordMetric as jest.Mock).mockClear();
      (params.scheduleNextScan as jest.Mock).mockClear();
      stopMock.mockClear();

      stopMock.mockRejectedValue(new Error('stop exploded'));

      await act(async () => {
        jest.advanceTimersByTime(
          RUNNING_AGENT_MAX_RUNTIME_SECONDS * 1000 +
            RUNNING_AGENT_WATCHDOG_CHECK_SECONDS * 1000,
        );
        await flushMicrotasks();
      });

      expect(params.logMessage).toHaveBeenCalledWith(
        expect.stringContaining('watchdog rotation error'),
      );
      expect(params.recordMetric).toHaveBeenCalledWith(
        AUTO_RUN_HEALTH_METRIC.REWARDS_ERRORS,
      );
      expect(lastRewardsEligibilityRef.current[scTrader]).toBeUndefined();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
    });
  });
});
