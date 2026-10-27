import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap, AgentType } from '../../../../constants/agent';
import {
  AUTO_RUN_HEALTH_METRIC,
  AUTO_RUN_START_STATUS,
  COOLDOWN_SECONDS,
  RUNNING_AGENT_ELIGIBILITY_CHECK_SECONDS,
  RUNNING_AGENT_MAX_RUNTIME_SECONDS,
  RUNNING_AGENT_WATCHDOG_CHECK_SECONDS,
  SCAN_BLOCKED_DELAY_SECONDS,
  SCAN_ELIGIBLE_DELAY_SECONDS,
} from '../../../../context/AutoRunProvider/constants';
import { useAutoRunLifecycle } from '../../../../context/AutoRunProvider/hooks/useAutoRunLifecycle';
import { AgentMeta } from '../../../../context/AutoRunProvider/types';
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
  configuredAgents: [] as AgentMeta[],
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
  isStalled: jest.fn().mockReturnValue(false),
  restartStallClock: jest.fn(),
  deferStalled: jest.fn(),
  isStallDeferred: jest.fn().mockReturnValue(false),
  getPreferredStartFrom: jest.fn().mockReturnValue(null),
  scanAndStartNext: jest.fn().mockResolvedValue({ startedId: null }),
  startSelectedAgentIfEligible: jest.fn().mockResolvedValue(false),
  stopAgentWithRecovery: jest.fn().mockResolvedValue(true),
  startAgentWithRetries: jest
    .fn()
    .mockResolvedValue({ status: AUTO_RUN_START_STATUS.STARTED }),
  getDeployabilityForRunningInstance: jest.fn().mockResolvedValue(null),
  getHandOverDeployability: jest.fn().mockResolvedValue({ canRun: true }),
  notifyGoalReachedOnHandOver: jest.fn(),
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

    it('keeps running agent when all others confirmed earned and schedules eligible delay', async () => {
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

    it('keeps the running agent when the only alternate has an unknown rewards status', async () => {
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
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.getHandOverDeployability).not.toHaveBeenCalled();
      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
      expect(params.scanAndStartNext).not.toHaveBeenCalled();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_ELIGIBLE_DELAY_SECONDS,
      );
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
        stopAgentWithRecovery: jest.fn().mockResolvedValue(true),
        scanAndStartNext: jest.fn().mockResolvedValue({ startedId: scOptimus }),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.stopAgentWithRecovery).toHaveBeenCalled();
      expect(params.scanAndStartNext).toHaveBeenCalledWith(
        scTrader,
        expect.objectContaining({ first: scOptimus, stoppedId: scTrader }),
      );
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

    it('falls through to a scan anchored on the selected instance when the fast path defers it', async () => {
      // Pins the wiring the empty-pool fast-path deferral depends on: the fast
      // path returns false WITHOUT notifying, and the scan that follows is
      // anchored so the same (drained) instance is the first candidate — which
      // is what lets degraded mode still start it. Covered as two units
      // elsewhere; this pins them together.
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: null,
        runningServiceConfigId: null,
        runningAgentTypeRef: { current: null },
        runningServiceConfigIdRef: { current: null },
        startSelectedAgentIfEligible: jest.fn().mockResolvedValue(false),
        getPreferredStartFrom: jest.fn().mockReturnValue('sc-previous'),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(params.startSelectedAgentIfEligible).toHaveBeenCalled();
      expect(params.scanAndStartNext).toHaveBeenCalledWith('sc-previous');
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

  describe('activity goal and Connect rotation', () => {
    const scConnect = 'sc-connect';
    const scPolystrat = 'sc-polystrat';
    const connectMeta = {
      ...makeAutoRunAgentMeta(
        AgentMap.Connect,
        AGENT_CONFIG[AgentMap.Connect],
        scConnect,
      ),
      stakingProgramId: 'no_staking',
    } as AgentMeta;
    const traderMeta = makeAutoRunAgentMeta(
      AgentMap.PredictTrader,
      AGENT_CONFIG[AgentMap.PredictTrader],
      scTrader,
    ) as AgentMeta;

    const flush = async () => {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
    };

    const makeConnectRunningParams = (
      overrides: Partial<Parameters<typeof useAutoRunLifecycle>[0]> = {},
    ) =>
      makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.Connect,
        runningServiceConfigId: scConnect,
        runningAgentTypeRef: { current: AgentMap.Connect },
        runningServiceConfigIdRef: { current: scConnect },
        orderedIncludedInstances: [scConnect, scTrader, scPolystrat],
        configuredAgents: [connectMeta, traderMeta],
        lastRewardsEligibilityRef: {
          current: { [scConnect]: false } as Partial<
            Record<string, boolean | undefined>
          >,
        },
        // Connect just met its goal; alternates have not earned yet.
        refreshRewardsEligibility: jest
          .fn()
          .mockImplementation(async (id: string) => id === scConnect),
        ...overrides,
      });

    it('does not rotate a staking agent that earned rewards but has not met its goal', async () => {
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        lastRewardsEligibilityRef: {
          current: { [scTrader]: false } as Partial<
            Record<string, boolean | undefined>
          >,
        },
        // Combined snapshot: staking KPI met, goal not met → not done.
        refreshRewardsEligibility: jest.fn().mockResolvedValue(false),
      });

      const { rerender } = renderHook((props) => useAutoRunLifecycle(props), {
        initialProps: params,
      });
      await flush();
      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();

      // Goal met too → the snapshot turns true and rotation follows.
      (params.refreshRewardsEligibility as jest.Mock).mockImplementation(
        async (id: string) => id === scTrader,
      );
      rerender({ ...params, rewardsTick: 1 });
      await flush();
      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
    });

    it('hands Connect over to a runnable alternate with one notification', async () => {
      const params = makeConnectRunningParams();

      renderHook(() => useAutoRunLifecycle(params));
      await flush();

      expect(params.getHandOverDeployability).toHaveBeenCalledWith(scTrader);
      expect(params.getHandOverDeployability).toHaveBeenCalledTimes(1);
      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scConnect);
      expect(params.scanAndStartNext).toHaveBeenCalledWith(
        scConnect,
        expect.objectContaining({ first: scTrader, stoppedId: scConnect }),
      );
      expect(params.notifyGoalReachedOnHandOver).toHaveBeenCalledTimes(1);
      // The notification follows a confirmed stop.
      expect(
        (params.stopAgentWithRecovery as jest.Mock).mock.invocationCallOrder[0],
      ).toBeLessThan(
        (params.notifyGoalReachedOnHandOver as jest.Mock).mock
          .invocationCallOrder[0],
      );
      expect(params.notifyGoalReachedOnHandOver).toHaveBeenCalledWith(
        scConnect,
      );
    });

    it('skips alternates that are done or cannot start when choosing the hand-over', async () => {
      const params = makeConnectRunningParams({
        refreshRewardsEligibility: jest
          .fn()
          .mockImplementation(
            async (id: string) => id === scConnect || id === scTrader,
          ),
        getHandOverDeployability: jest
          .fn()
          .mockResolvedValue({ canRun: false, reason: 'Low balance' }),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await flush();

      expect(params.getHandOverDeployability).not.toHaveBeenCalledWith(
        scTrader,
      );
      expect(params.getHandOverDeployability).toHaveBeenCalledWith(scPolystrat);
      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
    });

    it('passes over an alternate whose rewards read failed', async () => {
      const params = makeConnectRunningParams({
        orderedIncludedInstances: [scConnect, scTrader],
        refreshRewardsEligibility: jest
          .fn()
          .mockImplementation(async (id: string) =>
            id === scConnect ? true : undefined,
          ),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await flush();

      expect(params.getHandOverDeployability).not.toHaveBeenCalled();
      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
      expect(params.logMessage).toHaveBeenCalledWith(
        expect.stringContaining(
          `pass over ${scTrader}: rewards status unknown`,
        ),
      );
    });

    it('keeps Connect running and resets its rewards guard when nothing else can run', async () => {
      const lastRewardsEligibilityRef = {
        current: { [scConnect]: false } as Partial<
          Record<string, boolean | undefined>
        >,
      };
      const params = makeConnectRunningParams({
        lastRewardsEligibilityRef,
        getHandOverDeployability: jest
          .fn()
          .mockResolvedValue({ canRun: false, reason: 'Low balance' }),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await flush();

      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
      expect(params.notifyGoalReachedOnHandOver).not.toHaveBeenCalled();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_ELIGIBLE_DELAY_SECONDS,
      );
      // Connect stays met, so only a reset guard lets the next poll re-trigger.
      expect(lastRewardsEligibilityRef.current[scConnect]).toBeUndefined();
    });

    it.each([
      [
        'Connect is the only included instance',
        { orderedIncludedInstances: [scConnect] },
      ],
      [
        'every alternate is already done',
        { refreshRewardsEligibility: jest.fn().mockResolvedValue(true) },
      ],
      [
        "an alternate's deployability is unknown",
        {
          orderedIncludedInstances: [scConnect, scTrader],
          getHandOverDeployability: jest.fn().mockResolvedValue(null),
        },
      ],
    ])(
      'keeps Connect running when %s',
      async (
        _,
        overrides: Partial<Parameters<typeof useAutoRunLifecycle>[0]>,
      ) => {
        const lastRewardsEligibilityRef = {
          current: { [scConnect]: false } as Partial<
            Record<string, boolean | undefined>
          >,
        };
        const params = makeConnectRunningParams({
          lastRewardsEligibilityRef,
          ...overrides,
        });

        renderHook(() => useAutoRunLifecycle(params));
        await flush();

        expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
        expect(params.notifyGoalReachedOnHandOver).not.toHaveBeenCalled();
        expect(params.scheduleNextScan).toHaveBeenCalledWith(
          SCAN_ELIGIBLE_DELAY_SECONDS,
        );
        expect(lastRewardsEligibilityRef.current[scConnect]).toBeUndefined();
      },
    );

    it('hands over on the next rewards poll after an alternate becomes ready', async () => {
      const getHandOverDeployability = jest
        .fn()
        .mockResolvedValue({ canRun: false, reason: 'Low balance' });
      const params = makeConnectRunningParams({ getHandOverDeployability });

      const { rerender } = renderHook((props) => useAutoRunLifecycle(props), {
        initialProps: params,
      });
      await flush();
      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();

      // Connect is still met; an alternate has become runnable since.
      getHandOverDeployability.mockResolvedValue({ canRun: true });
      rerender({ ...params, rewardsTick: 1 });
      await flush();

      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scConnect);
      expect(params.notifyGoalReachedOnHandOver).toHaveBeenCalledTimes(1);
    });

    it('takes the stop-timeout backoff path and sends no notification', async () => {
      const lastRewardsEligibilityRef = {
        current: { [scConnect]: false } as Partial<
          Record<string, boolean | undefined>
        >,
      };
      const stopRetryBackoffUntilRef = {
        current: {} as Partial<Record<string, number>>,
      };
      const params = makeConnectRunningParams({
        lastRewardsEligibilityRef,
        stopRetryBackoffUntilRef,
        stopAgentWithRecovery: jest.fn().mockResolvedValue(false),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await flush();

      expect(params.notifyGoalReachedOnHandOver).not.toHaveBeenCalled();
      expect(params.scanAndStartNext).not.toHaveBeenCalled();
      expect(lastRewardsEligibilityRef.current[scConnect]).toBeUndefined();
      expect(stopRetryBackoffUntilRef.current[scConnect]).toBeGreaterThan(
        Date.now(),
      );
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
    });

    describe('watchdog force rotation of Connect', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      const flushMicrotasks = async () => {
        for (let i = 0; i < 20; i++) {
          await Promise.resolve();
        }
      };

      // Goal not met: only the runtime watchdog can trigger rotation.
      const runWatchdog = async (
        overrides: Partial<Parameters<typeof useAutoRunLifecycle>[0]>,
      ) => {
        const params = makeConnectRunningParams({
          refreshRewardsEligibility: jest.fn().mockResolvedValue(false),
          ...overrides,
        });
        renderHook(() => useAutoRunLifecycle(params));
        await act(async () => {
          await flushMicrotasks();
        });
        (params.scheduleNextScan as jest.Mock).mockClear();
        await act(async () => {
          jest.advanceTimersByTime(
            RUNNING_AGENT_MAX_RUNTIME_SECONDS * 1000 +
              RUNNING_AGENT_WATCHDOG_CHECK_SECONDS * 1000,
          );
          await flushMicrotasks();
        });
        return params;
      };

      it('keeps Connect running without treating it as goal reached', async () => {
        const lastRewardsEligibilityRef = {
          current: {} as Partial<Record<string, boolean | undefined>>,
        };
        const params = await runWatchdog({
          lastRewardsEligibilityRef,
          getHandOverDeployability: jest
            .fn()
            .mockResolvedValue({ canRun: false, reason: 'Low balance' }),
        });

        expect(params.getHandOverDeployability).toHaveBeenCalled();
        expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
        expect(params.notifyGoalReachedOnHandOver).not.toHaveBeenCalled();
        expect(params.scheduleNextScan).toHaveBeenCalledWith(
          SCAN_BLOCKED_DELAY_SECONDS,
        );
        expect(lastRewardsEligibilityRef.current[scConnect]).toBeUndefined();
      });

      it('hands over to a runnable alternate without a goal notification', async () => {
        const params = await runWatchdog({
          getHandOverDeployability: jest.fn().mockResolvedValue({
            canRun: true,
          }),
        });

        expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scConnect);
        expect(params.notifyGoalReachedOnHandOver).not.toHaveBeenCalled();
      });
    });

    it('hands a finished staking agent over to Connect when every other agent is done', async () => {
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        orderedIncludedInstances: [scTrader, scPolystrat, scConnect],
        configuredAgents: [traderMeta, connectMeta],
        lastRewardsEligibilityRef: {
          current: { [scTrader]: false } as Partial<
            Record<string, boolean | undefined>
          >,
        },
        // Connect is never done while not running.
        refreshRewardsEligibility: jest
          .fn()
          .mockImplementation(async (id: string) => id !== scConnect),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await flush();

      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
      expect(params.getHandOverDeployability).toHaveBeenCalledTimes(1);
      expect(params.getHandOverDeployability).toHaveBeenCalledWith(scConnect);
      expect(params.scanAndStartNext).toHaveBeenCalledWith(
        scTrader,
        expect.objectContaining({ first: scConnect }),
      );
    });
  });

  describe('rotation pre-check and hand-over', () => {
    const scThird = 'sc-third';
    const scFourth = 'sc-fourth';
    const scFifth = 'sc-fifth';

    const flush = async () => {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
    };

    const flushMicrotasks = async () => {
      for (let i = 0; i < 20; i++) {
        await Promise.resolve();
      }
    };

    const loggedMessages = (params: ReturnType<typeof makeHookParams>) =>
      (params.logMessage as jest.Mock).mock.calls.map(([message]) => message);

    // Trader is running and has just turned done; alternates are not done.
    const makeTraderRunningParams = (
      overrides: Partial<Parameters<typeof useAutoRunLifecycle>[0]> = {},
    ) =>
      makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        lastRewardsEligibilityRef: {
          current: { [scTrader]: false } as Partial<
            Record<string, boolean | undefined>
          >,
        },
        refreshRewardsEligibility: jest
          .fn()
          .mockImplementation(async (id: string) => id === scTrader),
        ...overrides,
      });

    it('hands over to the first runnable alternate after the current one, passing over and logging the others', async () => {
      const params = makeTraderRunningParams({
        // Circular order after the trader: optimus, third, fourth, fifth.
        orderedIncludedInstances: [
          scFifth,
          scTrader,
          scOptimus,
          scThird,
          scFourth,
        ],
        refreshRewardsEligibility: jest
          .fn()
          .mockImplementation(async (id: string) => {
            if (id === scTrader || id === scOptimus) return true;
            if (id === scThird) return undefined;
            return false;
          }),
        getHandOverDeployability: jest
          .fn()
          .mockImplementation(async (id: string) =>
            id === scFourth
              ? { canRun: false, reason: 'Low balance' }
              : { canRun: true },
          ),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await flush();

      // Done and unknown alternates never reach the deployability check.
      expect(params.getHandOverDeployability).not.toHaveBeenCalledWith(
        scOptimus,
      );
      expect(params.getHandOverDeployability).not.toHaveBeenCalledWith(scThird);
      const messages = loggedMessages(params);
      expect(messages).toContainEqual(
        expect.stringMatching(
          /^cycle=rewards-sc-\S+ trigger=rewards pass over sc-.+: done for the epoch$/,
        ),
      );
      expect(messages).toContainEqual(
        expect.stringContaining(`pass over ${scOptimus}: done for the epoch`),
      );
      expect(messages).toContainEqual(
        expect.stringContaining(`pass over ${scThird}: rewards status unknown`),
      );
      expect(messages).toContainEqual(
        expect.stringContaining(`pass over ${scFourth}: Low balance`),
      );
      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
      expect(params.scanAndStartNext).toHaveBeenCalledWith(scTrader, {
        first: scFifth,
        stoppedId: scTrader,
        cycleId: expect.stringMatching(/^rewards-/),
        trigger: 'rewards',
      });
    });

    it('hands over to an empty-pool alternate only when no rewarded one can start', async () => {
      const params = makeTraderRunningParams({
        orderedIncludedInstances: [scTrader, scOptimus, scThird, scFourth],
        getHandOverDeployability: jest
          .fn()
          .mockImplementation(async (id: string) => {
            if (id === scOptimus) {
              return { canRun: false, isEmptyRewardPool: true };
            }
            if (id === scThird) return { canRun: false, reason: 'Low balance' };
            return { canRun: false, isEmptyRewardPool: true };
          }),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await flush();

      expect(params.getHandOverDeployability).toHaveBeenCalledWith(scFourth);
      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
      expect(params.scanAndStartNext).toHaveBeenCalledWith(
        scTrader,
        expect.objectContaining({ first: scOptimus }),
      );
    });

    it('prefers a later rewarded alternate over an earlier empty-pool one', async () => {
      const params = makeTraderRunningParams({
        orderedIncludedInstances: [scTrader, scOptimus, scThird],
        getHandOverDeployability: jest
          .fn()
          .mockImplementation(async (id: string) =>
            id === scOptimus
              ? { canRun: false, isEmptyRewardPool: true }
              : { canRun: true },
          ),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await flush();

      expect(params.scanAndStartNext).toHaveBeenCalledWith(
        scTrader,
        expect.objectContaining({ first: scThird }),
      );
    });

    it('keeps the current agent running when no alternate can start', async () => {
      const params = makeTraderRunningParams({
        getHandOverDeployability: jest
          .fn()
          .mockResolvedValue({ canRun: false, reason: 'Low balance' }),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await flush();

      expect(params.getHandOverDeployability).toHaveBeenCalledWith(scOptimus);
      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
      expect(params.scanAndStartNext).not.toHaveBeenCalled();
      const messages = loggedMessages(params);
      expect(messages).toContainEqual(
        expect.stringContaining(
          `keeping ${scTrader} running, no runnable alternate rescan=${SCAN_ELIGIBLE_DELAY_SECONDS}s`,
        ),
      );
      expect(messages).toContainEqual(
        expect.stringContaining(
          `phase=rotate_end status=kept current=${scTrader}`,
        ),
      );
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_ELIGIBLE_DELAY_SECONDS,
      );
    });

    it.each([
      ['another agent started', scOptimus, 'ok', 1],
      ['nothing started', null, 'none', 0],
      ['the stopped agent started again', scTrader, 'none', 0],
    ])(
      'ends the rotation when %s',
      async (_, startedId, status, succeededCount) => {
        const params = makeTraderRunningParams({
          scanAndStartNext: jest.fn().mockResolvedValue({ startedId }),
        });

        renderHook(() => useAutoRunLifecycle(params));
        await flush();

        expect(loggedMessages(params)).toContainEqual(
          expect.stringContaining(
            `phase=rotate_end status=${status} current=${scTrader}`,
          ),
        );
        expect(
          (params.recordMetric as jest.Mock).mock.calls.filter(
            ([metric]) => metric === AUTO_RUN_HEALTH_METRIC.ROTATIONS_SUCCEEDED,
          ),
        ).toHaveLength(succeededCount);
      },
    );

    describe('hold recheck', () => {
      it('checks the order again on the scheduled rescan although the status is still done', async () => {
        const getHandOverDeployability = jest
          .fn()
          .mockResolvedValue({ canRun: false, reason: 'Low balance' });
        const params = makeTraderRunningParams({ getHandOverDeployability });

        const { rerender } = renderHook((props) => useAutoRunLifecycle(props), {
          initialProps: params,
        });
        await flush();
        expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();

        // A rewards poll alone does not re-trigger: the status is still done.
        getHandOverDeployability.mockResolvedValue({ canRun: true });
        rerender({ ...params, rewardsTick: 1 });
        await flush();
        expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();

        // The rescan the hold scheduled fires.
        rerender({ ...params, rewardsTick: 1, scanTick: 1 });
        await flush();

        expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
        expect(params.scanAndStartNext).toHaveBeenCalledWith(
          scTrader,
          expect.objectContaining({ first: scOptimus }),
        );
      });

      it('considers an agent added to the order during the hold', async () => {
        const params = makeTraderRunningParams({
          orderedIncludedInstances: [scTrader],
        });

        const { rerender } = renderHook((props) => useAutoRunLifecycle(props), {
          initialProps: params,
        });
        await flush();
        expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();

        rerender({
          ...params,
          orderedIncludedInstances: [scTrader, scThird],
          scanTick: 1,
        });
        await flush();

        expect(params.getHandOverDeployability).toHaveBeenCalledWith(scThird);
        expect(params.scanAndStartNext).toHaveBeenCalledWith(
          scTrader,
          expect.objectContaining({ first: scThird }),
        );
      });
    });

    describe('stalled current agent', () => {
      it('hands over as a stall, deferring the current agent', async () => {
        const params = makeTraderRunningParams({
          isStalled: jest
            .fn()
            .mockImplementation((id: string) => id === scTrader),
        });

        renderHook(() => useAutoRunLifecycle(params));
        await flush();

        expect(params.deferStalled).toHaveBeenCalledWith(scTrader);
        expect(params.restartStallClock).not.toHaveBeenCalled();
        expect(params.notifyGoalReachedOnHandOver).not.toHaveBeenCalled();
        expect(loggedMessages(params)).toContainEqual(
          expect.stringContaining(
            `trigger=stall phase=hand_over current=${scTrader} next=${scOptimus}`,
          ),
        );
        expect(params.scanAndStartNext).toHaveBeenCalledWith(
          scTrader,
          expect.objectContaining({ first: scOptimus, trigger: 'stall' }),
        );
      });

      it('does not defer the current agent when its stop times out', async () => {
        const params = makeTraderRunningParams({
          isStalled: jest
            .fn()
            .mockImplementation((id: string) => id === scTrader),
          stopAgentWithRecovery: jest.fn().mockResolvedValue(false),
        });

        renderHook(() => useAutoRunLifecycle(params));
        await flush();

        expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
        expect(params.deferStalled).not.toHaveBeenCalled();
        expect(params.scanAndStartNext).not.toHaveBeenCalled();
      });

      it('keeps the current agent running with a fresh stall hour when no alternate can start', async () => {
        const params = makeTraderRunningParams({
          isStalled: jest.fn().mockReturnValue(true),
          getHandOverDeployability: jest
            .fn()
            .mockResolvedValue({ canRun: false, reason: 'Low balance' }),
        });

        renderHook(() => useAutoRunLifecycle(params));
        await flush();

        expect(params.restartStallClock).toHaveBeenCalledWith(scTrader);
        expect(params.deferStalled).not.toHaveBeenCalled();
        expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
        expect(loggedMessages(params)).toContainEqual(
          expect.stringContaining(
            `trigger=stall phase=rotate_end status=kept current=${scTrader}`,
          ),
        );
      });

      it('does not hand over to a stall-deferred alternate', async () => {
        const params = makeTraderRunningParams({
          isStalled: jest
            .fn()
            .mockImplementation((id: string) => id === scTrader),
          isStallDeferred: jest
            .fn()
            .mockImplementation((id: string) => id === scOptimus),
        });

        renderHook(() => useAutoRunLifecycle(params));
        await flush();

        expect(params.getHandOverDeployability).not.toHaveBeenCalled();
        expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
        expect(loggedMessages(params)).toContainEqual(
          expect.stringContaining(
            `pass over ${scOptimus}: stalled on its activity goal, deferred`,
          ),
        );
      });
    });

    describe('stall-deferred alternate while the current agent is not stalled', () => {
      const makeDeferredOptimusParams = (
        thirdDeployability: Record<string, unknown>,
      ) =>
        makeTraderRunningParams({
          orderedIncludedInstances: [scTrader, scOptimus, scThird],
          isStallDeferred: jest
            .fn()
            .mockImplementation((id: string) => id === scOptimus),
          getHandOverDeployability: jest
            .fn()
            .mockImplementation(async (id: string) =>
              id === scThird ? thirdDeployability : { canRun: true },
            ),
        });

      it('prefers a later runnable alternate', async () => {
        const params = makeDeferredOptimusParams({ canRun: true });

        renderHook(() => useAutoRunLifecycle(params));
        await flush();

        expect(params.scanAndStartNext).toHaveBeenCalledWith(
          scTrader,
          expect.objectContaining({ first: scThird }),
        );
      });

      it('is chosen as a last resort', async () => {
        const params = makeDeferredOptimusParams({
          canRun: false,
          reason: 'Low balance',
        });

        renderHook(() => useAutoRunLifecycle(params));
        await flush();

        expect(params.getHandOverDeployability).toHaveBeenCalledWith(scOptimus);
        expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
        expect(params.scanAndStartNext).toHaveBeenCalledWith(
          scTrader,
          expect.objectContaining({ first: scOptimus }),
        );
      });
    });

    describe('runtime watchdog', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      const runWatchdog = async (
        overrides: Partial<Parameters<typeof useAutoRunLifecycle>[0]>,
      ) => {
        const params = makeTraderRunningParams({
          refreshRewardsEligibility: jest.fn().mockResolvedValue(false),
          ...overrides,
        });
        renderHook(() => useAutoRunLifecycle(params));
        await act(async () => {
          await flushMicrotasks();
        });
        (params.scheduleNextScan as jest.Mock).mockClear();
        await act(async () => {
          jest.advanceTimersByTime(
            RUNNING_AGENT_MAX_RUNTIME_SECONDS * 1000 +
              RUNNING_AGENT_WATCHDOG_CHECK_SECONDS * 1000,
          );
          await flushMicrotasks();
        });
        return params;
      };

      it('starts the chosen next agent rather than restarting the current one', async () => {
        const params = await runWatchdog({});

        expect(params.getHandOverDeployability).toHaveBeenCalledWith(scOptimus);
        expect(params.startAgentWithRetries).not.toHaveBeenCalled();
        expect(params.scanAndStartNext).toHaveBeenCalledWith(scTrader, {
          first: scOptimus,
          stoppedId: scTrader,
          cycleId: expect.stringMatching(/^watchdog-/),
          trigger: 'watchdog',
        });
      });

      it('keeps the current agent running and rechecks sooner when no alternate can start', async () => {
        const params = await runWatchdog({
          getHandOverDeployability: jest
            .fn()
            .mockResolvedValue({ canRun: false, reason: 'Low balance' }),
        });

        expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
        expect(params.scheduleNextScan).toHaveBeenCalledWith(
          SCAN_BLOCKED_DELAY_SECONDS,
        );
        expect(loggedMessages(params)).toContainEqual(
          expect.stringContaining(
            `trigger=watchdog keeping ${scTrader} running, no runnable alternate rescan=${SCAN_BLOCKED_DELAY_SECONDS}s`,
          ),
        );
      });
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
      for (let i = 0; i < 20; i++) {
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

    it('does not fire at 70 minutes and fires once the 4-hour cap is passed', async () => {
      const params = makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        refreshRewardsEligibility: jest.fn().mockResolvedValue(false),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await flushMicrotasks();
      });

      await act(async () => {
        jest.advanceTimersByTime(
          70 * 60 * 1000 + RUNNING_AGENT_WATCHDOG_CHECK_SECONDS * 1000,
        );
        await flushMicrotasks();
      });
      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(4 * 60 * 60 * 1000);
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

  describe('eviction watchdog — running instance evicted on-chain', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const flushMicrotasks = async () => {
      for (let i = 0; i < 20; i++) {
        await Promise.resolve();
      }
    };

    const makeRunningParams = (
      overrides: Partial<Parameters<typeof useAutoRunLifecycle>[0]> = {},
    ) =>
      makeHookParams({
        enabled: true,
        enabledRef: { current: true },
        runningAgentType: AgentMap.PredictTrader,
        runningServiceConfigId: scTrader,
        runningAgentTypeRef: { current: AgentMap.PredictTrader },
        runningServiceConfigIdRef: { current: scTrader },
        ...overrides,
      });

    const runOneCheck = async (
      params: ReturnType<typeof makeHookParams>,
    ): Promise<void> => {
      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await flushMicrotasks();
      });
      (params.stopAgentWithRecovery as jest.Mock).mockClear();
      (params.scheduleNextScan as jest.Mock).mockClear();

      await act(async () => {
        jest.advanceTimersByTime(
          RUNNING_AGENT_ELIGIBILITY_CHECK_SECONDS * 1000,
        );
        await flushMicrotasks();
      });
    };

    // R1: `rotateToNext` closes over data derived from the 5s-refetched
    // services query. If it stays in the effect's dep array, a re-render
    // between ticks tears the interval down and the 10-minute check never
    // fires. Re-rendering here stands in for that churn.
    it('still fires after re-renders that change callback identity', async () => {
      const getDeployability = jest.fn().mockResolvedValue({
        canRun: true,
        isAgentEvicted: true,
        isEligibleAfterEviction: true,
      });
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: getDeployability,
      });
      const { rerender } = renderHook(
        (p: Parameters<typeof useAutoRunLifecycle>[0]) =>
          useAutoRunLifecycle(p),
        { initialProps: params },
      );
      await act(async () => {
        await flushMicrotasks();
      });

      // Half a period in, re-render with fresh function identities.
      await act(async () => {
        jest.advanceTimersByTime(
          (RUNNING_AGENT_ELIGIBILITY_CHECK_SECONDS / 2) * 1000,
        );
        await flushMicrotasks();
      });
      await act(async () => {
        rerender({
          ...params,
          orderedIncludedInstances: [...params.orderedIncludedInstances],
          refreshRewardsEligibility: jest.fn().mockResolvedValue(false),
          getDeployabilityForRunningInstance: getDeployability,
        });
        // Let the rewards effect the re-render retriggers settle, so it isn't
        // holding `isRotatingRef` when the eviction tick lands.
        await flushMicrotasks();
      });

      await act(async () => {
        jest.advanceTimersByTime(
          (RUNNING_AGENT_ELIGIBILITY_CHECK_SECONDS / 2) * 1000,
        );
        await flushMicrotasks();
      });

      expect(getDeployability).toHaveBeenCalled();
    });

    // We stopped a running agent to get here, so a start that doesn't take
    // leaves the queue idle — it must not depend on the resume effect noticing.
    it('schedules a rescan when the recovery start fails', async () => {
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: jest.fn().mockResolvedValue({
          canRun: true,
          isAgentEvicted: true,
          isEligibleAfterEviction: true,
        }),
        startAgentWithRetries: jest
          .fn()
          .mockResolvedValue({ status: 'infra_failed', reason: 'boom' }),
      });

      await runOneCheck(params);

      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
      expect(params.logMessage).toHaveBeenCalledWith(
        expect.stringContaining('eviction recovery start failed'),
      );
    });

    it('does not schedule a rescan when the recovery start succeeds', async () => {
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: jest.fn().mockResolvedValue({
          canRun: true,
          isAgentEvicted: true,
          isEligibleAfterEviction: true,
        }),
        startAgentWithRetries: jest
          .fn()
          .mockResolvedValue({ status: 'started' }),
      });

      await runOneCheck(params);

      expect(params.scheduleNextScan).not.toHaveBeenCalled();
    });

    // `aborted` is auto-run being switched off mid-recovery, not a failure.
    it('does not schedule a rescan when the start is aborted', async () => {
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: jest.fn().mockResolvedValue({
          canRun: true,
          isAgentEvicted: true,
          isEligibleAfterEviction: true,
        }),
        startAgentWithRetries: jest
          .fn()
          .mockResolvedValue({ status: 'aborted' }),
      });

      await runOneCheck(params);

      expect(params.scheduleNextScan).not.toHaveBeenCalled();
    });

    // R5: the staking read is a network call; a rotation can complete while it
    // is in flight, and stopping `currentId` then would kill a different agent.
    it('does not act when the running instance changed during the read', async () => {
      const runningRef = { current: scTrader as string | null };
      const params = makeRunningParams({
        runningServiceConfigIdRef: runningRef,
        getDeployabilityForRunningInstance: jest.fn().mockImplementation(() => {
          runningRef.current = scOptimus;
          return Promise.resolve({
            canRun: true,
            isAgentEvicted: true,
            isEligibleAfterEviction: true,
          });
        }),
      });

      await runOneCheck(params);

      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
    });

    // R6: rotation waits COOLDOWN_SECONDS between stop and start so the
    // backend can finish tearing the service down; recovery must too.
    it('waits the rotation cooldown between the stop and the start', async () => {
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: jest.fn().mockResolvedValue({
          canRun: true,
          isAgentEvicted: true,
          isEligibleAfterEviction: true,
        }),
      });

      await runOneCheck(params);

      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
      expect(mockSleepAwareDelay).toHaveBeenCalledWith(COOLDOWN_SECONDS);
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(scTrader);
    });

    it('does nothing when the running instance is not evicted', async () => {
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: jest
          .fn()
          .mockResolvedValue({ canRun: true, isAgentEvicted: false }),
      });

      await runOneCheck(params);

      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
    });

    it('stops then starts an evicted instance that can re-stake', async () => {
      // The start path re-stakes through the middleware's deploy endpoint, so
      // the restart is the recovery. Starting on top of an incomplete stop is
      // the failure mode this branch introduces — hence the order assertion.
      const calls: string[] = [];
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: jest.fn().mockResolvedValue({
          canRun: true,
          isAgentEvicted: true,
          isEligibleAfterEviction: true,
        }),
        stopAgentWithRecovery: jest.fn().mockImplementation(async () => {
          calls.push('stop');
          return true;
        }),
        startAgentWithRetries: jest.fn().mockImplementation(async () => {
          calls.push('start');
          return { status: AUTO_RUN_START_STATUS.STARTED };
        }),
      });

      await runOneCheck(params);

      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(scTrader);
      expect(calls).toEqual(['stop', 'start']);
    });

    it('does not let the runtime watchdog rotate a just-recovered instance', async () => {
      // The instance id is unchanged across the recovery, so the runtime
      // watchdog would otherwise still be counting the pre-eviction runtime.
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: jest.fn().mockResolvedValue({
          canRun: true,
          isAgentEvicted: true,
          isEligibleAfterEviction: true,
        }),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await flushMicrotasks();
      });

      // Sit just under the runtime cap, then let the eviction check recover.
      await act(async () => {
        jest.advanceTimersByTime(
          RUNNING_AGENT_MAX_RUNTIME_SECONDS * 1000 -
            RUNNING_AGENT_ELIGIBILITY_CHECK_SECONDS * 1000,
        );
        await flushMicrotasks();
      });
      expect(params.startAgentWithRetries).toHaveBeenCalledTimes(1);

      (params.stopAgentWithRecovery as jest.Mock).mockClear();
      // The runtime watchdog would have fired here on the old clock.
      await act(async () => {
        jest.advanceTimersByTime(RUNNING_AGENT_WATCHDOG_CHECK_SECONDS * 1000);
        await flushMicrotasks();
      });

      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
    });

    it('does not start when the stop fails, and records backoff', async () => {
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: jest.fn().mockResolvedValue({
          canRun: true,
          isAgentEvicted: true,
          isEligibleAfterEviction: true,
        }),
        stopAgentWithRecovery: jest.fn().mockResolvedValue(false),
      });

      await runOneCheck(params);

      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
      expect(params.stopRetryBackoffUntilRef.current[scTrader]).toBeGreaterThan(
        Date.now(),
      );
    });

    it('rotates away from an eviction that cannot be cleared', async () => {
      // Inside minStakingDuration nothing can re-stake it, so holding the queue
      // for the runtime cap is pure idle time.
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: jest.fn().mockResolvedValue({
          canRun: false,
          reason: 'Evicted',
          isAgentEvicted: true,
          isEligibleAfterEviction: false,
        }),
        refreshRewardsEligibility: jest.fn().mockResolvedValue(false),
      });

      await runOneCheck(params);

      expect(params.stopAgentWithRecovery).toHaveBeenCalledWith(scTrader);
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
      expect(params.scanAndStartNext).toHaveBeenCalledWith(
        scTrader,
        expect.objectContaining({ first: scOptimus, trigger: 'eviction' }),
      );
    });

    it('ignores a transient staking read', async () => {
      // A flaky RPC must never stop a healthy agent.
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: jest.fn().mockResolvedValue({
          canRun: false,
          reason: 'Staking data unavailable',
          isTransient: true,
        }),
      });

      await runOneCheck(params);

      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
    });

    it('does not start a second recovery while the first is in flight', async () => {
      // A start blocked on the middleware's per-service staking lock resolves
      // slowly; the rotation guard is what stops the next check piling on.
      let releaseStart: (() => void) | undefined;
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: jest.fn().mockResolvedValue({
          canRun: true,
          isAgentEvicted: true,
          isEligibleAfterEviction: true,
        }),
        startAgentWithRetries: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              releaseStart = () =>
                resolve({ status: AUTO_RUN_START_STATUS.STARTED });
            }),
        ),
      });

      renderHook(() => useAutoRunLifecycle(params));
      await act(async () => {
        await flushMicrotasks();
      });

      await act(async () => {
        jest.advanceTimersByTime(
          RUNNING_AGENT_ELIGIBILITY_CHECK_SECONDS * 1000,
        );
        await flushMicrotasks();
      });
      expect(params.startAgentWithRetries).toHaveBeenCalledTimes(1);

      // Second tick while the first start is still pending.
      await act(async () => {
        jest.advanceTimersByTime(
          RUNNING_AGENT_ELIGIBILITY_CHECK_SECONDS * 1000,
        );
        await flushMicrotasks();
      });
      expect(params.startAgentWithRetries).toHaveBeenCalledTimes(1);

      await act(async () => {
        releaseStart?.();
        await flushMicrotasks();
      });
    });

    it('does nothing when the running instance has no metadata', async () => {
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: jest.fn().mockResolvedValue(null),
      });

      await runOneCheck(params);

      expect(params.stopAgentWithRecovery).not.toHaveBeenCalled();
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
    });

    it('logs, records a metric and reschedules when the check throws', async () => {
      const params = makeRunningParams({
        getDeployabilityForRunningInstance: jest
          .fn()
          .mockRejectedValue(new Error('boom')),
      });

      await runOneCheck(params);

      expect(params.logMessage).toHaveBeenCalledWith(
        expect.stringContaining('eviction watchdog error'),
      );
      expect(params.recordMetric).toHaveBeenCalledWith(
        AUTO_RUN_HEALTH_METRIC.REWARDS_ERRORS,
      );
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
      for (let i = 0; i < 20; i++) {
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
