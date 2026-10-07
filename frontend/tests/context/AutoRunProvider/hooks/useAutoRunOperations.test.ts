import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap } from '../../../../constants/agent';
import { useAutoRunOperations } from '../../../../context/AutoRunProvider/hooks/useAutoRunOperations';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeAutoRunAgentMeta,
} from '../../../helpers/factories';

// Mock sub-hooks since this is a composition hook
const mockUseAutoRunStartOperations = jest.fn().mockReturnValue({
  startAgentWithRetries: jest.fn().mockResolvedValue({ status: 'started' }),
});
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunStartOperations',
  () => ({
    useAutoRunStartOperations: (...args: unknown[]) =>
      mockUseAutoRunStartOperations(...args),
  }),
);
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunStopOperations',
  () => ({
    useAutoRunStopOperations: jest.fn().mockReturnValue({
      stopAgentWithRecovery: jest.fn().mockResolvedValue(true),
    }),
  }),
);
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunVerboseLogger',
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  () => require('../../../helpers/autoRunMocks').verboseLoggerMockFactory(),
);
const mockRefreshRewardsEligibilityHelper = jest.fn().mockResolvedValue(false);
jest.mock('../../../../context/AutoRunProvider/utils/autoRunHelpers', () => ({
  refreshRewardsEligibility: (...args: unknown[]) =>
    mockRefreshRewardsEligibilityHelper(...args),
}));
jest.mock('../../../../context/AutoRunProvider/utils/utils', () => ({
  getInstanceDisplayNames: jest.fn().mockReturnValue({
    agentName: 'Omenstrat',
    instanceName: 'corzim-vardor96',
  }),
  notifySkipped: jest.fn(),
  notifyGoalReached: jest.fn(),
}));
const { notifyGoalReached: mockNotifyGoalReached } = jest.requireMock(
  '../../../../context/AutoRunProvider/utils/utils',
) as { notifyGoalReached: jest.Mock };

const makeHookParams = () => ({
  enabled: true,
  enabledRef: { current: true },
  runningServiceConfigIdRef: { current: null as string | null },
  configuredAgents: [
    makeAutoRunAgentMeta(
      AgentMap.PredictTrader,
      AGENT_CONFIG[AgentMap.PredictTrader],
    ),
  ],
  createSafeIfNeeded: jest.fn().mockResolvedValue(undefined),
  showNotification: jest.fn(),
  onAutoRunInstanceStarted: jest.fn(),
  onAutoRunStartStateChange: jest.fn(),
  startService: jest.fn().mockResolvedValue(undefined),
  waitForBalancesReady: jest.fn().mockResolvedValue(true),
  waitForRunningInstance: jest.fn().mockResolvedValue(true),
  getRewardSnapshot: jest.fn().mockReturnValue(undefined),
  setRewardSnapshot: jest.fn(),
  recordMetric: jest.fn(),
  logMessage: jest.fn(),
});

describe('useAutoRunOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes refreshRewardsEligibility, notifySkipOnce, startAgentWithRetries, stopAgentWithRecovery', () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunOperations(params));
    expect(typeof result.current.refreshRewardsEligibility).toBe('function');
    expect(typeof result.current.notifySkipOnce).toBe('function');
    expect(typeof result.current.startAgentWithRetries).toBe('function');
    expect(typeof result.current.stopAgentWithRecovery).toBe('function');
  });

  describe('notifySkipOnce', () => {
    it('does not notify when reason is undefined', () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunOperations(params));
      act(() => {
        result.current.notifySkipOnce(DEFAULT_SERVICE_CONFIG_ID, undefined);
      });
      expect(params.showNotification).not.toHaveBeenCalled();
    });

    it('does not notify for loading reasons', () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunOperations(params));
      act(() => {
        result.current.notifySkipOnce(
          DEFAULT_SERVICE_CONFIG_ID,
          'Loading: Balances',
          true,
        );
      });
      expect(params.logMessage).not.toHaveBeenCalled();
    });

    it('notifies once per reason per instance', () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunOperations(params));
      act(() => {
        result.current.notifySkipOnce(DEFAULT_SERVICE_CONFIG_ID, 'Low balance');
      });
      act(() => {
        result.current.notifySkipOnce(DEFAULT_SERVICE_CONFIG_ID, 'Low balance');
      });
      // Only logged once (dedup)
      expect(params.logMessage).toHaveBeenCalledTimes(1);
    });

    it('notifies again for different reason', () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunOperations(params));
      act(() => {
        result.current.notifySkipOnce(DEFAULT_SERVICE_CONFIG_ID, 'Low balance');
      });
      act(() => {
        result.current.notifySkipOnce(DEFAULT_SERVICE_CONFIG_ID, 'Evicted');
      });
      expect(params.logMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshRewardsEligibility', () => {
    it('delegates to helper with correct arguments', async () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunOperations(params));

      await act(async () => {
        await result.current.refreshRewardsEligibility(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });

      expect(mockRefreshRewardsEligibilityHelper).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
          configuredAgents: params.configuredAgents,
          logMessage: params.logMessage,
        }),
      );
    });

    it('passes lastStartedAtRef and runningServiceConfigIdRef to the helper', async () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunOperations(params));

      await act(async () => {
        await result.current.refreshRewardsEligibility(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });

      expect(mockRefreshRewardsEligibilityHelper).toHaveBeenCalledWith(
        expect.objectContaining({
          lastStartedAtRef: expect.objectContaining({
            current: expect.any(Object),
          }),
          runningServiceConfigIdRef: params.runningServiceConfigIdRef,
        }),
      );
    });

    it('wrapped onAutoRunInstanceStarted updates lastStartedAtRef AND forwards to caller callback', async () => {
      // Fix depends on onAutoRunInstanceStarted being wrapped so lastStartedAtRef
      // is populated on successful starts. Without this, the stale-true override
      // always sees 0 and degenerates into "override everything to false".
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunOperations(params));

      // Grab the wrapped callback that useAutoRunOperations passed to
      // useAutoRunStartOperations — this is the version that updates the ref.
      const startOperationsArgs =
        mockUseAutoRunStartOperations.mock.calls.at(-1)?.[0];
      const wrappedOnStarted = startOperationsArgs?.onAutoRunInstanceStarted as
        | ((serviceConfigId: string) => void)
        | undefined;
      expect(typeof wrappedOnStarted).toBe('function');

      const beforeMs = Date.now();
      await act(async () => {
        wrappedOnStarted?.(DEFAULT_SERVICE_CONFIG_ID);
      });
      const afterMs = Date.now();

      // Caller's original callback still fires.
      expect(params.onAutoRunInstanceStarted).toHaveBeenCalledWith(
        DEFAULT_SERVICE_CONFIG_ID,
      );

      // Inspect the ref through the helper mock by triggering a refresh on the
      // same hook instance — the hook forwards its `lastStartedAtRef` to the
      // helper, so the call args pick up the write we just performed.
      await act(async () => {
        await result.current.refreshRewardsEligibility(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });

      const helperArgs =
        mockRefreshRewardsEligibilityHelper.mock.calls.at(-1)?.[0];
      const writtenTs =
        helperArgs?.lastStartedAtRef?.current?.[DEFAULT_SERVICE_CONFIG_ID];
      expect(typeof writtenTs).toBe('number');
      expect(writtenTs).toBeGreaterThanOrEqual(beforeMs);
      expect(writtenTs).toBeLessThanOrEqual(afterMs + 200);
    });

    it('calls recordMetric on rewards fetch error via onRewardsFetchError callback', async () => {
      mockRefreshRewardsEligibilityHelper.mockImplementation(
        async ({
          onRewardsFetchError,
        }: {
          onRewardsFetchError?: () => void;
        }) => {
          onRewardsFetchError?.();
          return false;
        },
      );

      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunOperations(params));

      await act(async () => {
        await result.current.refreshRewardsEligibility(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });

      expect(params.recordMetric).toHaveBeenCalledWith('rewardsErrors');
    });
  });

  describe('skip notification reset on disable', () => {
    it('resets skip notifications when auto-run is disabled', () => {
      const params = makeHookParams();
      const { result, rerender } = renderHook(
        ({ enabled }) => useAutoRunOperations({ ...params, enabled }),
        { initialProps: { enabled: true } },
      );

      act(() => {
        result.current.notifySkipOnce(DEFAULT_SERVICE_CONFIG_ID, 'Low balance');
      });
      expect(params.logMessage).toHaveBeenCalledTimes(1);

      // Disable auto-run -> resets dedup state
      rerender({ enabled: false });

      // Re-enable
      rerender({ enabled: true });

      // Same reason should notify again after reset
      act(() => {
        result.current.notifySkipOnce(DEFAULT_SERVICE_CONFIG_ID, 'Low balance');
      });
      expect(params.logMessage).toHaveBeenCalledTimes(2);
    });
  });
  describe('Connect run baseline', () => {
    const CONNECT_ID = 'sc-connect';
    const NOW_MS = 1_800_000_000_500;
    const NOW_SECONDS = 1_800_000_000;

    type HelperArgs = {
      getConnectRunBaseline: (serviceConfigId: string) => number;
      onConnectGoalRead: (
        serviceConfigId: string,
        lastMetAt: number | null,
      ) => void;
    };

    const renderOperations = () => {
      const params = makeHookParams();
      const hook = renderHook(
        ({ enabled }) => useAutoRunOperations({ ...params, enabled }),
        { initialProps: { enabled: true } },
      );
      const helperArgs = async () => {
        await act(async () => {
          await hook.result.current.refreshRewardsEligibility(CONNECT_ID);
        });
        return mockRefreshRewardsEligibilityHelper.mock.calls.at(
          -1,
        )?.[0] as HelperArgs;
      };
      const startInstance = () => {
        const onStarted = mockUseAutoRunStartOperations.mock.calls.at(-1)?.[0]
          .onAutoRunInstanceStarted as (serviceConfigId: string) => void;
        act(() => onStarted(CONNECT_ID));
      };
      return { params, hook, helperArgs, startInstance };
    };

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('starts counting from the first evaluation when Auto-run did not start it', async () => {
      const { helperArgs } = renderOperations();
      const { getConnectRunBaseline } = await helperArgs();

      expect(getConnectRunBaseline(CONNECT_ID)).toBe(NOW_SECONDS);
      jest.spyOn(Date, 'now').mockReturnValue(NOW_MS + 60_000);
      expect(getConnectRunBaseline(CONNECT_ID)).toBe(NOW_SECONDS);
    });

    it('uses the Auto-run start time in unix seconds', async () => {
      const { helperArgs, startInstance } = renderOperations();
      startInstance();
      const { getConnectRunBaseline } = await helperArgs();

      expect(getConnectRunBaseline(CONNECT_ID)).toBe(NOW_SECONDS);
    });

    it('moves the baseline to the handled run and clears the snapshot', async () => {
      const { params, hook, helperArgs, startInstance } = renderOperations();
      startInstance();
      const { getConnectRunBaseline, onConnectGoalRead } = await helperArgs();
      onConnectGoalRead(CONNECT_ID, NOW_SECONDS + 900);

      act(() => hook.result.current.advanceConnectRunBaseline(CONNECT_ID));

      expect(getConnectRunBaseline(CONNECT_ID)).toBe(NOW_SECONDS + 900);
      expect(params.setRewardSnapshot).toHaveBeenCalledWith(CONNECT_ID, false);
    });

    it('keeps the baseline when no run time was read', async () => {
      const { hook, helperArgs, startInstance } = renderOperations();
      startInstance();
      const { getConnectRunBaseline } = await helperArgs();

      act(() => hook.result.current.advanceConnectRunBaseline(CONNECT_ID));

      expect(getConnectRunBaseline(CONNECT_ID)).toBe(NOW_SECONDS);
    });

    it('takes a later Auto-run start over an older handled run', async () => {
      const { hook, helperArgs, startInstance } = renderOperations();
      startInstance();
      const { getConnectRunBaseline, onConnectGoalRead } = await helperArgs();
      onConnectGoalRead(CONNECT_ID, NOW_SECONDS + 900);
      act(() => hook.result.current.advanceConnectRunBaseline(CONNECT_ID));

      jest.spyOn(Date, 'now').mockReturnValue(NOW_MS + 3_600_000);
      startInstance();

      expect(getConnectRunBaseline(CONNECT_ID)).toBe(NOW_SECONDS + 3_600);
    });

    it('sends the goal-reached notification once per completed run', async () => {
      const { params, hook, helperArgs, startInstance } = renderOperations();
      startInstance();
      const { onConnectGoalRead } = await helperArgs();
      onConnectGoalRead(CONNECT_ID, NOW_SECONDS + 900);

      act(() => hook.result.current.notifyGoalReachedOnce(CONNECT_ID));
      act(() => hook.result.current.notifyGoalReachedOnce(CONNECT_ID));
      expect(mockNotifyGoalReached).toHaveBeenCalledTimes(1);
      expect(mockNotifyGoalReached).toHaveBeenCalledWith(
        params.showNotification,
        'Omenstrat',
        'corzim-vardor96',
      );

      onConnectGoalRead(CONNECT_ID, NOW_SECONDS + 4_500);
      act(() => hook.result.current.notifyGoalReachedOnce(CONNECT_ID));
      expect(mockNotifyGoalReached).toHaveBeenCalledTimes(2);
    });

    it('notifies on every hand-over of a manually started instance', async () => {
      // No Auto-run start is recorded for a manual start.
      const { hook, helperArgs } = renderOperations();
      const { onConnectGoalRead } = await helperArgs();

      onConnectGoalRead(CONNECT_ID, NOW_SECONDS + 900);
      act(() => hook.result.current.notifyGoalReachedOnce(CONNECT_ID));

      // Next manual run: Connect restarted and completed another run.
      onConnectGoalRead(CONNECT_ID, NOW_SECONDS + 7_200);
      act(() => hook.result.current.notifyGoalReachedOnce(CONNECT_ID));

      expect(mockNotifyGoalReached).toHaveBeenCalledTimes(2);
    });

    it('gives the next run a fresh baseline after a hand-over', async () => {
      const { hook, helperArgs } = renderOperations();
      const { getConnectRunBaseline, onConnectGoalRead } = await helperArgs();
      expect(getConnectRunBaseline(CONNECT_ID)).toBe(NOW_SECONDS);
      onConnectGoalRead(CONNECT_ID, NOW_SECONDS + 900);

      act(() => hook.result.current.notifyGoalReachedOnce(CONNECT_ID));

      jest.spyOn(Date, 'now').mockReturnValue(NOW_MS + 3_600_000);
      expect(getConnectRunBaseline(CONNECT_ID)).toBe(NOW_SECONDS + 3_600);
    });

    it('resets the baseline and notification state on disable', async () => {
      const { hook, helperArgs, startInstance } = renderOperations();
      startInstance();
      const { getConnectRunBaseline, onConnectGoalRead } = await helperArgs();
      onConnectGoalRead(CONNECT_ID, NOW_SECONDS + 900);
      act(() => hook.result.current.advanceConnectRunBaseline(CONNECT_ID));
      act(() => hook.result.current.notifyGoalReachedOnce(CONNECT_ID));

      hook.rerender({ enabled: false });
      hook.rerender({ enabled: true });

      expect(getConnectRunBaseline(CONNECT_ID)).toBe(NOW_SECONDS);
      act(() => hook.result.current.notifyGoalReachedOnce(CONNECT_ID));
      expect(mockNotifyGoalReached).toHaveBeenCalledTimes(2);
    });
  });
});
