import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap } from '../../../../constants/agent';
import {
  AUTO_RUN_VERBOSE_LOGS,
  HEALTH_SUMMARY_INTERVAL_SECONDS,
} from '../../../../context/AutoRunProvider/constants';
import { useAutoRunController } from '../../../../context/AutoRunProvider/hooks/useAutoRunController';
import {
  AgentMeta,
  ObservedGoal,
  RewardSnapshot,
} from '../../../../context/AutoRunProvider/types';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  DEFAULT_TS_CHECKPOINT,
  makeActivityGoal,
  makeAutoRunAgentMeta,
  makeStakingRewardsInfo,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../../../helpers/factories';

jest.mock('../../../../hooks', () => ({
  useActivityGoal: jest.fn().mockReturnValue({ activityGoal: null }),
  useRewardContext: jest.fn().mockReturnValue({
    isEpochTargetMet: false,
    stakingRewardsDetails: null,
  }),
  useEpochWorkStatus: jest.fn().mockReturnValue({ isDoneForEpoch: false }),
  useAgentRunning: jest.fn().mockReturnValue({
    runningAgentType: null,
    runningServiceConfigId: null,
  }),
  useStartService: jest.fn().mockReturnValue({
    startService: jest.fn().mockResolvedValue(undefined),
  }),
}));
jest.mock('../../../../hooks/useBalanceAndRefillRequirementsContext', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn().mockReturnValue({
    allowStartAgentByServiceConfigId: jest.fn().mockReturnValue(true),
    hasBalancesForServiceConfigId: jest.fn().mockReturnValue(true),
  }),
}));
jest.mock('../../../../hooks/useIsAgentGeoRestricted', () => ({
  useIsAgentGeoRestricted: jest
    .fn()
    .mockReturnValue({ isAgentGeoRestricted: false }),
}));
jest.mock('../../../../hooks/useIsInitiallyFunded', () => ({
  useIsInitiallyFunded: jest.fn().mockReturnValue({
    isInstanceInitiallyFunded: jest.fn().mockReturnValue(true),
  }),
}));
jest.mock('../../../../context/AutoRunProvider/utils/autoRunHelpers', () => ({
  fetchDeployabilityForAgent: jest.fn().mockResolvedValue({ canRun: true }),
  getUsableRewardStatus: jest.fn().mockReturnValue(undefined),
  isStakingEpochExpired: jest.fn().mockReturnValue(false),
}));
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useLogAutoRunEvent',
  () => ({
    useLogAutoRunEvent: jest.fn().mockReturnValue({
      logMessage: jest.fn(),
    }),
  }),
);
const makeSignals = () => ({
  enabledRef: { current: false },
  runningAgentTypeRef: { current: null },
  runningServiceConfigIdRef: { current: null as string | null },
  lastRewardsEligibilityRef: { current: {} },
  stallClockRef: { current: {} },
  scanTick: 0,
  rewardsTick: 0,
  scheduleNextScan: jest.fn(),
  hasScheduledScan: jest.fn().mockReturnValue(false),
  waitForInstanceSelection: jest.fn().mockResolvedValue(true),
  waitForBalancesReady: jest.fn().mockResolvedValue(true),
  waitForRunningInstance: jest.fn().mockResolvedValue(true),
  getRewardSnapshot: jest
    .fn<RewardSnapshot | undefined, [string]>()
    .mockReturnValue(undefined),
  setRewardSnapshot: jest.fn(),
  getObservedGoal: jest
    .fn<ObservedGoal | undefined, [string]>()
    .mockReturnValue(undefined),
  isStalled: jest.fn().mockReturnValue(false),
  restartStallClock: jest.fn(),
  deferStalled: jest.fn(),
  clearStallDeferral: jest.fn(),
  isStallDeferred: jest.fn().mockReturnValue(false),
  getBalancesStatus: jest.fn().mockReturnValue({ ready: true, loading: false }),
});
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunSignals',
  () => ({
    useAutoRunSignals: jest.fn(),
  }),
);
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunOperations',
  () => ({
    useAutoRunOperations: jest.fn().mockReturnValue({
      refreshRewardsEligibility: jest.fn().mockResolvedValue(false),
      notifyGoalReachedOnHandOver: jest.fn(),
      notifySkipOnce: jest.fn(),
      startAgentWithRetries: jest.fn().mockResolvedValue({ status: 'started' }),
      stopAgentWithRecovery: jest.fn().mockResolvedValue(true),
    }),
  }),
);
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunScanner',
  () => ({
    useAutoRunScanner: jest.fn().mockReturnValue({
      getPreferredStartFrom: jest.fn().mockReturnValue(null),
      scanAndStartNext: jest.fn().mockResolvedValue({ startedId: null }),
      startSelectedAgentIfEligible: jest.fn().mockResolvedValue(false),
    }),
  }),
);
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunLifecycle',
  () => ({
    useAutoRunLifecycle: jest.fn().mockReturnValue({
      stopCurrentRunningAgent: jest.fn().mockResolvedValue(true),
    }),
  }),
);

const { useAutoRunLifecycle } = jest.requireMock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunLifecycle',
) as { useAutoRunLifecycle: jest.Mock };
const { useAutoRunOperations } = jest.requireMock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunOperations',
) as { useAutoRunOperations: jest.Mock };
const { useAutoRunSignals } = jest.requireMock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunSignals',
) as { useAutoRunSignals: jest.Mock };
const { useAutoRunScanner } = jest.requireMock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunScanner',
) as { useAutoRunScanner: jest.Mock };
const { useActivityGoal, useEpochWorkStatus, useRewardContext } =
  jest.requireMock('../../../../hooks') as {
    useActivityGoal: jest.Mock;
    useEpochWorkStatus: jest.Mock;
    useRewardContext: jest.Mock;
  };
const { fetchDeployabilityForAgent, getUsableRewardStatus } = jest.requireMock(
  '../../../../context/AutoRunProvider/utils/autoRunHelpers',
) as {
  fetchDeployabilityForAgent: jest.Mock;
  getUsableRewardStatus: jest.Mock;
};
const { useLogAutoRunEvent } = jest.requireMock(
  '../../../../context/AutoRunProvider/hooks/useLogAutoRunEvent',
) as { useLogAutoRunEvent: jest.Mock };

const makeHookParams = (
  overrides: Partial<Parameters<typeof useAutoRunController>[0]> = {},
) => ({
  enabled: false,
  orderedIncludedInstances: [DEFAULT_SERVICE_CONFIG_ID],
  configuredAgents: [],
  selectedAgentType: AgentMap.PredictTrader,
  selectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
  isSelectedAgentDetailsLoading: false,
  getSelectedEligibility: jest.fn().mockReturnValue({ canRun: true }),
  canCreateSafeForChain: jest.fn().mockReturnValue({ ok: true }),
  createSafeIfNeeded: jest.fn().mockResolvedValue(undefined),
  showNotification: jest.fn(),
  onAutoRunInstanceStarted: jest.fn(),
  onAutoRunStartStateChange: jest.fn(),
  ...overrides,
});

describe('useAutoRunController', () => {
  let signals: ReturnType<typeof makeSignals>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    signals = makeSignals();
    useAutoRunSignals.mockReturnValue(signals);
    useEpochWorkStatus.mockReturnValue({ isDoneForEpoch: false });
    useActivityGoal.mockReturnValue({ activityGoal: null });
    useRewardContext.mockReturnValue({
      isEpochTargetMet: false,
      stakingRewardsDetails: null,
    });
    getUsableRewardStatus.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns stopRunningAgent and runningAgentType', () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunController(params));
    expect(typeof result.current.stopRunningAgent).toBe('function');
    expect(result.current.runningAgentType).toBeNull();
  });

  it('stopRunningAgent delegates to lifecycle hook', async () => {
    const mockStop = jest.fn().mockResolvedValue(true);
    useAutoRunLifecycle.mockReturnValue({
      stopCurrentRunningAgent: mockStop,
    });
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunController(params));
    await act(async () => {
      await result.current.stopRunningAgent();
    });
    expect(mockStop).toHaveBeenCalled();
  });

  it('resets health stats when disabled', () => {
    const params = makeHookParams({ enabled: true });
    const { rerender, result } = renderHook(
      (props) => useAutoRunController(props),
      { initialProps: params },
    );
    rerender({ ...params, enabled: false });
    expect(typeof result.current.stopRunningAgent).toBe('function');
    const lastSignalsCall =
      useAutoRunSignals.mock.calls[useAutoRunSignals.mock.calls.length - 1][0];
    expect(lastSignalsCall.enabled).toBe(false);
  });

  const describeVerbose = AUTO_RUN_VERBOSE_LOGS ? describe : describe.skip;
  describeVerbose('health summary logging (AUTO_RUN_VERBOSE_LOGS)', () => {
    it('logs health summary at interval when enabled', () => {
      const mockLogMessage = jest.fn();
      useLogAutoRunEvent.mockReturnValue({ logMessage: mockLogMessage });

      const params = makeHookParams({ enabled: true });
      renderHook(() => useAutoRunController(params));

      act(() => {
        jest.advanceTimersByTime(HEALTH_SUMMARY_INTERVAL_SECONDS * 1000);
      });
      const summaryCalls = mockLogMessage.mock.calls.filter(
        (call: string[]) =>
          typeof call[0] === 'string' && call[0].includes('health summary'),
      );
      expect(summaryCalls).toHaveLength(0);
    });

    it('logs health summary when metrics have been recorded, then resets', () => {
      const mockLogMessage = jest.fn();
      useLogAutoRunEvent.mockReturnValue({ logMessage: mockLogMessage });

      const params = makeHookParams({ enabled: true });
      renderHook(() => useAutoRunController(params));

      const operationsCallArgs = useAutoRunOperations.mock.calls[0][0] as {
        recordMetric: (metric: string) => void;
      };
      const { recordMetric } = operationsCallArgs;

      act(() => {
        recordMetric('startErrors');
        recordMetric('startErrors');
        recordMetric('stopTimeouts');
      });

      act(() => {
        jest.advanceTimersByTime(HEALTH_SUMMARY_INTERVAL_SECONDS * 1000);
      });

      const summaryCalls = mockLogMessage.mock.calls.filter(
        (call: string[]) =>
          typeof call[0] === 'string' && call[0].includes('health summary'),
      );
      expect(summaryCalls).toHaveLength(1);
      expect(summaryCalls[0][0]).toContain('startErrors=2');
      expect(summaryCalls[0][0]).toContain('stopTimeouts=1');
      expect(summaryCalls[0][0]).toContain('rewardsErrors=0');

      mockLogMessage.mockClear();

      act(() => {
        jest.advanceTimersByTime(HEALTH_SUMMARY_INTERVAL_SECONDS * 1000);
      });

      const summaryCallsAfterReset = mockLogMessage.mock.calls.filter(
        (call: string[]) =>
          typeof call[0] === 'string' && call[0].includes('health summary'),
      );
      expect(summaryCallsAfterReset).toHaveLength(0);
    });

    it('clears health summary interval on disable', () => {
      const mockLogMessage = jest.fn();
      useLogAutoRunEvent.mockReturnValue({ logMessage: mockLogMessage });

      const params = makeHookParams({ enabled: true });
      const { rerender } = renderHook((props) => useAutoRunController(props), {
        initialProps: params,
      });
      rerender({ ...params, enabled: false });
      act(() => {
        jest.advanceTimersByTime(HEALTH_SUMMARY_INTERVAL_SECONDS * 1000 * 2);
      });
      // Interval should have been cleared - no health summary logged
      const summaryCalls = mockLogMessage.mock.calls.filter(
        (call: string[]) =>
          typeof call[0] === 'string' && call[0].includes('health summary'),
      );
      expect(summaryCalls).toHaveLength(0);
    });
  });
  describe('activity goal and Connect wiring', () => {
    const lastCallArgs = (mock: jest.Mock) =>
      mock.mock.calls[mock.mock.calls.length - 1][0];
    const connectMeta = {
      ...makeAutoRunAgentMeta(
        AgentMap.Connect,
        AGENT_CONFIG[AgentMap.Connect],
        MOCK_SERVICE_CONFIG_ID_2,
      ),
      stakingProgramId: 'no_staking',
    } as AgentMeta;
    const traderMeta = makeAutoRunAgentMeta(
      AgentMap.PredictTrader,
      AGENT_CONFIG[AgentMap.PredictTrader],
    ) as AgentMeta;

    it('feeds the selected done-for-epoch signal (staking + goal) to the signals', () => {
      useEpochWorkStatus.mockReturnValue({ isDoneForEpoch: true });
      renderHook(() =>
        useAutoRunController(
          makeHookParams({ configuredAgents: [traderMeta] }),
        ),
      );
      const signalsArgs = lastCallArgs(useAutoRunSignals);
      expect(signalsArgs.isSelectedDoneForEpoch).toBe(true);
      expect(signalsArgs.isSelectedNoStakingAgent).toBe(false);
      expect(signalsArgs).not.toHaveProperty('isEpochTargetMet');
    });

    it('flags a selected Connect instance as no-staking', () => {
      renderHook(() =>
        useAutoRunController(
          makeHookParams({
            configuredAgents: [traderMeta, connectMeta],
            selectedServiceConfigId: MOCK_SERVICE_CONFIG_ID_2,
          }),
        ),
      );
      expect(lastCallArgs(useAutoRunSignals).isSelectedNoStakingAgent).toBe(
        true,
      );
    });

    it('passes the Connect operations and configured agents to the lifecycle', () => {
      const configuredAgents = [traderMeta, connectMeta];
      renderHook(() =>
        useAutoRunController(makeHookParams({ configuredAgents })),
      );
      const operations = useAutoRunOperations.mock.results[0].value;
      const lifecycleArgs = lastCallArgs(useAutoRunLifecycle);
      expect(lifecycleArgs.configuredAgents).toBe(configuredAgents);
      expect(lifecycleArgs.notifyGoalReachedOnHandOver).toBe(
        operations.notifyGoalReachedOnHandOver,
      );
    });

    it('probes hand-over deployability with the running gate ignored', async () => {
      renderHook(() =>
        useAutoRunController(
          makeHookParams({ configuredAgents: [traderMeta, connectMeta] }),
        ),
      );
      const { getHandOverDeployability } = lastCallArgs(useAutoRunLifecycle);

      await act(async () => {
        await getHandOverDeployability(DEFAULT_SERVICE_CONFIG_ID);
      });

      expect(fetchDeployabilityForAgent).toHaveBeenCalledWith(
        traderMeta,
        expect.objectContaining({ ignoreRunningAgent: true }),
      );
    });

    it('returns null from the hand-over probe for an unknown instance', async () => {
      renderHook(() =>
        useAutoRunController(makeHookParams({ configuredAgents: [] })),
      );
      const { getHandOverDeployability } = lastCallArgs(useAutoRunLifecycle);

      let result: unknown;
      await act(async () => {
        result = await getHandOverDeployability('sc-unknown');
      });
      expect(result).toBeNull();
      expect(fetchDeployabilityForAgent).not.toHaveBeenCalled();
    });
  });

  describe('scanner wiring', () => {
    const lastScannerArgs = () =>
      useAutoRunScanner.mock.calls[useAutoRunScanner.mock.calls.length - 1][0];
    const traderMeta = makeAutoRunAgentMeta(
      AgentMap.PredictTrader,
      AGENT_CONFIG[AgentMap.PredictTrader],
    ) as AgentMeta;
    const RUNNING_ID = DEFAULT_SERVICE_CONFIG_ID;

    const renderWithRunning = (runningId: string | null) => {
      signals.runningServiceConfigIdRef.current = runningId;
      renderHook(() =>
        useAutoRunController(
          makeHookParams({ configuredAgents: [traderMeta] }),
        ),
      );
      return lastScannerArgs();
    };

    it('treats the running instance as stopped when the scan confirmed its stop', async () => {
      const { getDeployabilityForAgent } = renderWithRunning(RUNNING_ID);

      await act(async () => {
        await getDeployabilityForAgent(traderMeta, { stoppedId: RUNNING_ID });
      });

      const context = fetchDeployabilityForAgent.mock.calls[0][1];
      expect(context.runningServiceConfigId).toBeNull();
      expect(context).not.toHaveProperty('stoppedId');
    });

    it('keeps the running instance when a different instance was stopped', async () => {
      const { getDeployabilityForAgent } = renderWithRunning(RUNNING_ID);

      await act(async () => {
        await getDeployabilityForAgent(traderMeta, {
          stoppedId: MOCK_SERVICE_CONFIG_ID_2,
        });
      });

      const context = fetchDeployabilityForAgent.mock.calls[0][1];
      expect(context.runningServiceConfigId).toBe(RUNNING_ID);
      expect(context).not.toHaveProperty('stoppedId');
    });

    it('returns the usable status of the stored snapshot for a configured instance', () => {
      const nowMs = 1_800_000_000_000;
      jest.setSystemTime(nowMs);
      const snapshot: RewardSnapshot = {
        done: true,
        readAt: nowMs - 1000,
        stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
        tsCheckpoint: DEFAULT_TS_CHECKPOINT,
        livenessPeriod: { _isBigNumber: true, _hex: '0x015180' },
        goalUnit: null,
        goalTarget: null,
        goalPeriodStart: null,
      };
      const observedGoal: ObservedGoal = {
        goal: makeActivityGoal(),
        observedAt: nowMs - 500,
      };
      signals.getRewardSnapshot.mockReturnValue(snapshot);
      signals.getObservedGoal.mockReturnValue(observedGoal);
      getUsableRewardStatus.mockReturnValue(true);
      const { getRewardStatus } = renderWithRunning(null);

      expect(getRewardStatus(DEFAULT_SERVICE_CONFIG_ID)).toBe(true);
      expect(signals.getRewardSnapshot).toHaveBeenCalledWith(
        DEFAULT_SERVICE_CONFIG_ID,
      );
      expect(getUsableRewardStatus).toHaveBeenCalledWith(snapshot, {
        stakingProgramId: traderMeta.stakingProgramId,
        nowMs,
        observedGoal,
      });
    });

    it('returns an unknown rewards status for an instance that is not configured', () => {
      getUsableRewardStatus.mockReturnValue(true);
      const { getRewardStatus } = renderWithRunning(null);

      expect(getRewardStatus('sc-unknown')).toBeUndefined();
      expect(getUsableRewardStatus).not.toHaveBeenCalled();
    });

    it('wires the stall helpers from the signals into the scanner and lifecycle', () => {
      const scannerArgs = renderWithRunning(null);
      const lifecycleArgs =
        useAutoRunLifecycle.mock.calls[
          useAutoRunLifecycle.mock.calls.length - 1
        ][0];

      expect(scannerArgs.isStallDeferred).toBe(signals.isStallDeferred);
      expect(scannerArgs.clearStallDeferral).toBe(signals.clearStallDeferral);
      expect(lifecycleArgs.isStalled).toBe(signals.isStalled);
      expect(lifecycleArgs.restartStallClock).toBe(signals.restartStallClock);
      expect(lifecycleArgs.deferStalled).toBe(signals.deferStalled);
      expect(lifecycleArgs.isStallDeferred).toBe(signals.isStallDeferred);
      expect(useAutoRunOperations.mock.calls[0][0].stallClockRef).toBe(
        signals.stallClockRef,
      );
    });
  });

  describe('selected-instance snapshot inputs', () => {
    const traderMeta = makeAutoRunAgentMeta(
      AgentMap.PredictTrader,
      AGENT_CONFIG[AgentMap.PredictTrader],
    ) as AgentMeta;
    const lastSignalsArgs = () =>
      useAutoRunSignals.mock.calls[useAutoRunSignals.mock.calls.length - 1][0];

    it('feeds the selected program, rewards epoch and activity goal to the signals', () => {
      const details = makeStakingRewardsInfo();
      const activityGoal = makeActivityGoal();
      useRewardContext.mockReturnValue({ stakingRewardsDetails: details });
      useActivityGoal.mockReturnValue({ activityGoal });

      renderHook(() =>
        useAutoRunController(
          makeHookParams({ configuredAgents: [traderMeta] }),
        ),
      );

      expect(useActivityGoal).toHaveBeenCalledWith(DEFAULT_SERVICE_CONFIG_ID);
      const signalsArgs = lastSignalsArgs();
      expect(signalsArgs.selectedStakingProgramId).toBe(
        traderMeta.stakingProgramId,
      );
      expect(signalsArgs.selectedRewardsEpoch).toEqual({
        tsCheckpoint: details.tsCheckpoint,
        livenessPeriod: details.livenessPeriod,
      });
      expect(signalsArgs.selectedActivityGoal).toBe(activityGoal);
    });

    it('feeds no program or epoch when the selection is unknown and rewards are not loaded', () => {
      renderHook(() =>
        useAutoRunController(
          makeHookParams({
            configuredAgents: [traderMeta],
            selectedServiceConfigId: 'sc-unknown',
          }),
        ),
      );

      const signalsArgs = lastSignalsArgs();
      expect(signalsArgs.selectedStakingProgramId).toBeUndefined();
      expect(signalsArgs.selectedRewardsEpoch).toBeUndefined();
      expect(signalsArgs.selectedActivityGoal).toBeNull();
    });
  });
});
