import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AGENT_CONFIG } from '../../../../config/agents';
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
  makeAutoRunAgentMeta,
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

const trader = AgentMap.PredictTrader;
const optimus = AgentMap.Optimus;

const makeHookParams = (
  overrides: Partial<Parameters<typeof useAutoRunLifecycle>[0]> = {},
) => ({
  // Default: disabled so effects don't fire unwanted async operations
  enabled: false,
  runningAgentType: null as AgentType | null,
  orderedIncludedAgentTypes: [trader, optimus],
  configuredAgents: [
    makeAutoRunAgentMeta(
      trader,
      AGENT_CONFIG[trader],
      DEFAULT_SERVICE_CONFIG_ID,
    ),
    makeAutoRunAgentMeta(
      optimus,
      AGENT_CONFIG[optimus],
      MOCK_SERVICE_CONFIG_ID_2,
    ),
  ],
  enabledRef: { current: false },
  runningAgentTypeRef: { current: null as AgentType | null },
  lastRewardsEligibilityRef: {
    current: {} as Partial<Record<AgentType, boolean | undefined>>,
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
    current: {} as Partial<Record<AgentType, number>>,
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
    it('returns false when no running agent', async () => {
      const params = makeHookParams({ runningAgentType: null });
      const { result } = renderHook(() => useAutoRunLifecycle(params));

      let stopped: boolean | undefined;
      await act(async () => {
        stopped = await result.current.stopCurrentRunningAgent();
      });
      expect(stopped).toBe(false);
    });

    it('delegates to stopAgentWithRecovery for running agent', async () => {
      const params = makeHookParams({ runningAgentType: trader });
      const { result } = renderHook(() => useAutoRunLifecycle(params));

      await act(async () => {
        await result.current.stopCurrentRunningAgent();
      });
      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(
        trader,
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    it('returns false when agent not in configuredAgents', async () => {
      const params = makeHookParams({
        runningAgentType: trader,
        configuredAgents: [],
      });
      const { result } = renderHook(() => useAutoRunLifecycle(params));

      let stopped: boolean | undefined;
      await act(async () => {
        stopped = await result.current.stopCurrentRunningAgent();
      });
      expect(stopped).toBe(false);
    });
  });

  describe('stopRetryBackoffUntilRef cleanup', () => {
    it('clears backoff state when disabled', () => {
      const stopRetryBackoffUntilRef = {
        current: {
          [trader]: Date.now() + 60_000,
        } as Partial<Record<AgentType, number>>,
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
    it('triggers rotation on rewards false→true transition', async () => {
      const lastRewardsEligibilityRef = {
        current: {
          [trader]: false,
        } as Partial<Record<AgentType, boolean | undefined>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: trader,
        runningAgentTypeRef: { current: trader },
        lastRewardsEligibilityRef,
        // trader returns true (triggers false→true), optimus returns false (rotation proceeds)
        refreshRewardsEligibility: jest
          .fn()
          .mockImplementation(
            async (agentType: AgentType) => agentType === trader,
          ),
        getRewardSnapshot: jest.fn().mockReturnValue(false),
      });

      renderHook(() => useAutoRunLifecycle(params));
      // Let async rotation complete
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(
        trader,
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    it('does not rotate when previousEligibility was already true', async () => {
      const lastRewardsEligibilityRef = {
        current: {
          [trader]: true,
        } as Partial<Record<AgentType, boolean | undefined>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: trader,
        runningAgentTypeRef: { current: trader },
        lastRewardsEligibilityRef,
        refreshRewardsEligibility: jest.fn().mockResolvedValue(true),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
    });

    it('keeps running agent when all others earned and schedules eligible delay', async () => {
      const lastRewardsEligibilityRef = {
        current: {
          [trader]: false,
        } as Partial<Record<AgentType, boolean | undefined>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: trader,
        runningAgentTypeRef: { current: trader },
        lastRewardsEligibilityRef,
        refreshRewardsEligibility: jest.fn().mockResolvedValue(true),
        // All other agents earned
        getRewardSnapshot: jest.fn().mockReturnValue(true),
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

    it('resets rewards guard and sets backoff on stop failure', async () => {
      const lastRewardsEligibilityRef = {
        current: {
          [trader]: false,
        } as Partial<Record<AgentType, boolean | undefined>>,
      };
      const stopRetryBackoffUntilRef = {
        current: {} as Partial<Record<AgentType, number>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: trader,
        runningAgentTypeRef: { current: trader },
        lastRewardsEligibilityRef,
        stopRetryBackoffUntilRef,
        // Return true for trader (triggers rotation), false for optimus (rotation proceeds)
        refreshRewardsEligibility: jest
          .fn()
          .mockImplementation(async (agentType: AgentType) =>
            agentType === trader ? true : false,
          ),
        getRewardSnapshot: jest.fn().mockReturnValue(false),
        stopAgentWithRecovery: jest.fn().mockResolvedValue(false),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(lastRewardsEligibilityRef.current[trader]).toBeUndefined();
      expect(stopRetryBackoffUntilRef.current[trader]).toBeGreaterThan(
        Date.now(),
      );
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
    });

    it('scans after successful stop and cooldown', async () => {
      const lastRewardsEligibilityRef = {
        current: {
          [trader]: false,
        } as Partial<Record<AgentType, boolean | undefined>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: trader,
        runningAgentTypeRef: { current: trader },
        lastRewardsEligibilityRef,
        // trader returns true (triggers rotation), optimus returns false (rotation proceeds)
        refreshRewardsEligibility: jest
          .fn()
          .mockImplementation(
            async (agentType: AgentType) => agentType === trader,
          ),
        getRewardSnapshot: jest.fn().mockReturnValue(false),
        stopAgentWithRecovery: jest.fn().mockResolvedValue(true),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.stopAgentWithRecovery).toHaveBeenCalled();
      // After cooldown, scanAndStartNext should be called
      expect(params.scanAndStartNext).toHaveBeenCalledWith(trader);
      expect(params.recordMetric).toHaveBeenCalledWith('rotationsSucceeded');
    });
  });

  describe('startup when no agent running', () => {
    it('tries selected agent first then scans on initial enable', async () => {
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: null,
        runningAgentTypeRef: { current: null },
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
        runningAgentTypeRef: { current: null },
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

    /**
     * Helper: flush microtasks (pending Promises) without advancing fake timers.
     * Repeated iterations ensure multi-hop `.then()` chains fully settle.
     */
    const flushMicrotasks = async () => {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
    };

    it('calls stopAgentWithRecovery when agent exceeds max runtime', async () => {
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: trader,
        runningAgentTypeRef: { current: trader },
        // optimus returns false so allEarnedOrUnknown is false → rotation proceeds
        refreshRewardsEligibility: jest.fn().mockResolvedValue(false),
        getRewardSnapshot: jest.fn().mockReturnValue(false),
        stopAgentWithRecovery: jest.fn().mockResolvedValue(true),
      });

      renderHook(() => useAutoRunLifecycle(params));

      // Flush the initial rewards-check effect (async mocks resolve via microtasks)
      await act(async () => {
        await flushMicrotasks();
      });

      // Clear mocks from the initial rewards check so we only assert watchdog calls
      (params.stopAgentWithRecovery as jest.Mock).mockClear();
      (params.refreshRewardsEligibility as jest.Mock).mockClear();

      // Advance past RUNNING_AGENT_MAX_RUNTIME_SECONDS so the watchdog triggers,
      // then advance one more watchdog check interval to fire the callback.
      await act(async () => {
        jest.advanceTimersByTime(
          RUNNING_AGENT_MAX_RUNTIME_SECONDS * 1000 +
            RUNNING_AGENT_WATCHDOG_CHECK_SECONDS * 1000,
        );
        await flushMicrotasks();
      });

      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(
        trader,
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    it('does not stop when all other agents are earned (force mode, no alternative)', async () => {
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: trader,
        runningAgentTypeRef: { current: trader },
        // All other agents earned → allEarnedOrUnknown is true → no stop
        refreshRewardsEligibility: jest.fn().mockResolvedValue(true),
        getRewardSnapshot: jest.fn().mockReturnValue(true),
      });

      renderHook(() => useAutoRunLifecycle(params));

      // Flush initial rewards-check effect
      await act(async () => {
        await flushMicrotasks();
      });

      (params.stopAgentWithRecovery as jest.Mock).mockClear();
      (params.scheduleNextScan as jest.Mock).mockClear();

      // Advance past max runtime + one watchdog interval
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
        runningAgentType: trader,
        runningAgentTypeRef: { current: trader },
        startSelectedAgentIfEligible: jest.fn().mockResolvedValue(true),
      });

      const { rerender } = renderHook((props) => useAutoRunLifecycle(props), {
        initialProps: params,
      });

      // Flush initial mount effects (rewards check etc.)
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // Clear mocks so we only track resume-path calls
      mockSleepAwareDelay.mockClear();
      (params.startSelectedAgentIfEligible as jest.Mock).mockClear();
      (params.scanAndStartNext as jest.Mock).mockClear();

      // Agent stopped while auto-run is still enabled → triggers resume path
      const resumeParams = {
        ...params,
        runningAgentType: null,
        runningAgentTypeRef: { current: null },
      };

      rerender(resumeParams);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // Resume path uses COOLDOWN_SECONDS, not AUTO_RUN_START_DELAY_SECONDS
      expect(mockSleepAwareDelay).toHaveBeenCalledWith(COOLDOWN_SECONDS);
      expect(params.startSelectedAgentIfEligible).toHaveBeenCalled();
    });

    it('falls through to scanAndStartNext when selected agent fails to start', async () => {
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: trader,
        runningAgentTypeRef: { current: trader },
        startSelectedAgentIfEligible: jest.fn().mockResolvedValue(false),
      });

      const { rerender } = renderHook((props) => useAutoRunLifecycle(props), {
        initialProps: params,
      });

      // Flush initial mount effects
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockSleepAwareDelay.mockClear();
      (params.startSelectedAgentIfEligible as jest.Mock).mockClear();
      (params.scanAndStartNext as jest.Mock).mockClear();

      // Agent stopped while auto-run is still enabled
      const resumeParams = {
        ...params,
        runningAgentType: null,
        runningAgentTypeRef: { current: null },
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

  describe('rotation with no other agents (empty orderedIncludedAgentTypes)', () => {
    it('schedules eligible delay when current agent is the only included agent', async () => {
      const lastRewardsEligibilityRef = {
        current: {
          [trader]: false,
        } as Partial<Record<AgentType, boolean | undefined>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: trader,
        runningAgentTypeRef: { current: trader },
        lastRewardsEligibilityRef,
        // Only trader in the list — no other agents to rotate to
        orderedIncludedAgentTypes: [trader],
        configuredAgents: [
          makeAutoRunAgentMeta(
            trader,
            AGENT_CONFIG[trader],
            DEFAULT_SERVICE_CONFIG_ID,
          ),
        ],
        // trader returns true (triggers false→true transition)
        refreshRewardsEligibility: jest.fn().mockResolvedValue(true),
        getRewardSnapshot: jest.fn().mockReturnValue(false),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // rotateToNext sees otherAgents.length === 0, schedules eligible delay, returns early
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
          [trader]: false,
        } as Partial<Record<AgentType, boolean | undefined>>,
      };
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: trader,
        runningAgentTypeRef: { current: trader },
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
      expect(lastRewardsEligibilityRef.current[trader]).toBeUndefined();
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
        current: {} as Partial<Record<AgentType, boolean | undefined>>,
      };
      const refreshMock = jest.fn().mockResolvedValue(false);
      // stopAgentWithRecovery rejects to make rotateToNext throw inside the watchdog
      const stopMock = jest.fn().mockRejectedValue(new Error('stop exploded'));
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: trader,
        runningAgentTypeRef: { current: trader },
        lastRewardsEligibilityRef,
        refreshRewardsEligibility: refreshMock,
        getRewardSnapshot: jest.fn().mockReturnValue(false),
        stopAgentWithRecovery: stopMock,
      });

      renderHook(() => useAutoRunLifecycle(params));

      // Flush the initial rewards-check effect (refreshRewardsEligibility
      // returns false for trader, so snapshot !== true → no rotation triggered)
      await act(async () => {
        await flushMicrotasks();
      });

      // Clear mocks from initial effects
      (params.logMessage as jest.Mock).mockClear();
      (params.recordMetric as jest.Mock).mockClear();
      (params.scheduleNextScan as jest.Mock).mockClear();
      stopMock.mockClear();

      // Make stopAgentWithRecovery reject again for the watchdog call
      stopMock.mockRejectedValue(new Error('stop exploded'));

      // Advance past max runtime + one watchdog interval to trigger the watchdog
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
      expect(lastRewardsEligibilityRef.current[trader]).toBeUndefined();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
    });
  });
});
