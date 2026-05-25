import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap } from '../../../../constants/agent';
import { MiddlewareDeploymentStatusMap } from '../../../../constants/deployment';
import { AUTO_RUN_START_STATUS } from '../../../../context/AutoRunProvider/constants';
import { useAutoRunStartOperations } from '../../../../context/AutoRunProvider/hooks/useAutoRunStartOperations';
import { ServicesService } from '../../../../service/Services';
import * as delayModule from '../../../../utils/delay';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeAutoRunAgentMeta,
} from '../../../helpers/factories';

jest.mock('../../../../utils/delay', () =>
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../../helpers/autoRunMocks').delayMockFactoryWithTimeout(),
);

jest.mock('../../../../service/Services', () => ({
  ServicesService: {
    getDeployment: jest.fn(),
  },
}));

const mockGetDeployment = ServicesService.getDeployment as jest.Mock;

const mockSleepAwareDelay = delayModule.sleepAwareDelay as jest.Mock;
const mockWithTimeout = delayModule.withTimeout as jest.Mock;

const makeHookParams = (
  overrides: Partial<Parameters<typeof useAutoRunStartOperations>[0]> = {},
) => ({
  enabledRef: { current: true },
  configuredAgents: [
    makeAutoRunAgentMeta(
      AgentMap.PredictTrader,
      AGENT_CONFIG[AgentMap.PredictTrader],
    ),
  ],
  createSafeIfNeeded: jest.fn().mockResolvedValue(undefined),
  startService: jest.fn().mockResolvedValue(undefined),
  waitForBalancesReady: jest.fn().mockResolvedValue(true),
  waitForRunningInstance: jest.fn().mockResolvedValue(true),
  onAutoRunInstanceStarted: jest.fn(),
  onAutoRunStartStateChange: jest.fn(),
  showNotification: jest.fn(),
  recordMetric: jest.fn(),
  logMessage: jest.fn(),
  logVerbose: jest.fn(),
  ...overrides,
});

describe('useAutoRunStartOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSleepAwareDelay.mockResolvedValue(true);
    mockWithTimeout.mockImplementation((promise: Promise<unknown>) => promise);
    // Default: deployment not active (BUILT) → forces a real start
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.BUILT,
    });
  });

  it('returns ABORTED when disabled before start', async () => {
    const params = makeHookParams({ enabledRef: { current: false } });
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.ABORTED);
  });

  it('returns AGENT_BLOCKED when agent is not configured', async () => {
    const params = makeHookParams({ configuredAgents: [] });
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string; reason?: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.AGENT_BLOCKED);
    expect(startResult?.reason).toBe('Not configured');
  });

  it('returns ABORTED when balance wait fails', async () => {
    const params = makeHookParams({
      waitForBalancesReady: jest.fn().mockResolvedValue(false),
    });
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.ABORTED);
  });

  it('returns STARTED on successful start and deploy confirmation', async () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.STARTED);
    expect(params.onAutoRunInstanceStarted).toHaveBeenCalledWith(
      DEFAULT_SERVICE_CONFIG_ID,
    );
    expect(params.onAutoRunStartStateChange).toHaveBeenCalledWith(true);
  });

  it('returns STARTED immediately when deployment is genuinely active (DEPLOYED)', async () => {
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.DEPLOYED,
    });
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.STARTED);
    expect(params.startService).not.toHaveBeenCalled();
    expect(params.onAutoRunInstanceStarted).toHaveBeenCalledWith(
      DEFAULT_SERVICE_CONFIG_ID,
    );
  });

  it('returns INFRA_FAILED after all retries exhausted', async () => {
    const params = makeHookParams({
      waitForRunningInstance: jest.fn().mockResolvedValue(false),
    });
    mockWithTimeout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string; reason?: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.INFRA_FAILED);
    expect(startResult?.reason).toBe('running timeout');
    expect(params.recordMetric).toHaveBeenCalled();
    expect(params.showNotification).toHaveBeenCalled();
  });

  it('returns ABORTED when disabled during retry loop', async () => {
    const enabledRef = { current: true };
    const params = makeHookParams({
      enabledRef,
      waitForRunningInstance: jest.fn().mockImplementation(async () => {
        enabledRef.current = false;
        return false;
      }),
    });
    mockWithTimeout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.ABORTED);
  });

  it('calls onAutoRunStartStateChange(false) in finally block', async () => {
    const params = makeHookParams({
      waitForRunningInstance: jest.fn().mockResolvedValue(false),
    });
    mockWithTimeout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutoRunStartOperations(params));

    await act(async () => {
      await result.current.startAgentWithRetries(DEFAULT_SERVICE_CONFIG_ID);
    });

    const calls = (params.onAutoRunStartStateChange as jest.Mock).mock.calls;
    expect(calls[0][0]).toBe(true);
    expect(calls[calls.length - 1][0]).toBe(false);
  });

  it('retries with backoff when start throws but eventually fails', async () => {
    mockWithTimeout.mockRejectedValue(new Error('RPC error'));

    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.INFRA_FAILED);
    expect(mockSleepAwareDelay).toHaveBeenCalled();
  });

  it('returns INFRA_FAILED with retry interrupted when sleepAwareDelay returns false but still enabled', async () => {
    const params = makeHookParams({
      waitForRunningInstance: jest.fn().mockResolvedValue(false),
    });
    mockWithTimeout.mockResolvedValue(undefined);
    mockSleepAwareDelay.mockResolvedValue(false);

    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string; reason?: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.INFRA_FAILED);
    expect(startResult?.reason).toBe('retry interrupted');
  });

  it('returns ABORTED when sleepAwareDelay returns false and enabledRef becomes false', async () => {
    const enabledRef = { current: true };
    const params = makeHookParams({
      enabledRef,
      waitForRunningInstance: jest.fn().mockResolvedValue(false),
    });
    mockWithTimeout.mockResolvedValue(undefined);
    mockSleepAwareDelay.mockImplementation(async () => {
      enabledRef.current = false;
      return false;
    });

    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.ABORTED);
  });

  describe('deployment liveness check (OPE-1741 regression)', () => {
    it('falls through to real start when getDeployment returns BUILT (agent stopped)', async () => {
      mockGetDeployment.mockResolvedValue({
        status: MiddlewareDeploymentStatusMap.BUILT,
      });
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunStartOperations(params));

      let startResult: { status: string } | undefined;
      await act(async () => {
        startResult = await result.current.startAgentWithRetries(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
      expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.STARTED);
      expect(params.startService).toHaveBeenCalled();
    });

    it('short-circuits when getDeployment confirms DEPLOYED', async () => {
      mockGetDeployment.mockResolvedValue({
        status: MiddlewareDeploymentStatusMap.DEPLOYED,
      });
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunStartOperations(params));

      let startResult: { status: string } | undefined;
      await act(async () => {
        startResult = await result.current.startAgentWithRetries(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
      expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.STARTED);
      expect(params.startService).not.toHaveBeenCalled();
      expect(params.onAutoRunInstanceStarted).toHaveBeenCalledWith(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    it('falls through to real start when getDeployment throws (network error)', async () => {
      mockGetDeployment.mockRejectedValue(new Error('Network error'));
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunStartOperations(params));

      let startResult: { status: string } | undefined;
      await act(async () => {
        startResult = await result.current.startAgentWithRetries(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
      expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.STARTED);
      expect(params.startService).toHaveBeenCalled();
    });

    it('short-circuits when getDeployment confirms DEPLOYING (transitional active state)', async () => {
      mockGetDeployment.mockResolvedValue({
        status: MiddlewareDeploymentStatusMap.DEPLOYING,
      });
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunStartOperations(params));

      let startResult: { status: string } | undefined;
      await act(async () => {
        startResult = await result.current.startAgentWithRetries(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
      expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.STARTED);
      expect(params.startService).not.toHaveBeenCalled();
    });
  });
});
