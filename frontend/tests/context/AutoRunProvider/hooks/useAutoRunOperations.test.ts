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
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunStartOperations',
  () => ({
    useAutoRunStartOperations: jest.fn().mockReturnValue({
      startAgentWithRetries: jest.fn().mockResolvedValue({ status: 'started' }),
    }),
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
}));

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
  updateSelectedServiceConfigId: jest.fn(),
  getSelectedEligibility: jest.fn().mockReturnValue({ canRun: true }),
  createSafeIfNeeded: jest.fn().mockResolvedValue(undefined),
  canSwitchAgentRef: { current: true },
  showNotification: jest.fn(),
  onAutoRunInstanceStarted: jest.fn(),
  onAutoRunStartStateChange: jest.fn(),
  startService: jest.fn().mockResolvedValue(undefined),
  waitForInstanceSelection: jest.fn().mockResolvedValue(true),
  waitForBalancesReady: jest.fn().mockResolvedValue(true),
  waitForRunningInstance: jest.fn().mockResolvedValue(true),
  getBalancesStatus: jest.fn().mockReturnValue({ ready: true, loading: false }),
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
});
