import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AgentMap, AgentType } from '../../../../constants/agent';
import { MiddlewareDeploymentStatusMap } from '../../../../constants/deployment';
import { useAutoRunStopOperations } from '../../../../context/AutoRunProvider/hooks/useAutoRunStopOperations';
import { ServicesService } from '../../../../service/Services';
import * as delayModule from '../../../../utils/delay';
import { DEFAULT_SERVICE_CONFIG_ID } from '../../../helpers/factories';

jest.mock('../../../../service/Services', () => ({
  ServicesService: {
    stopDeployment: jest.fn(),
    getDeployment: jest.fn(),
  },
}));
jest.mock('../../../../utils/delay', () =>
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../../helpers/autoRunMocks').delayMockFactoryWithTimeout(),
);

const mockStopDeployment = ServicesService.stopDeployment as jest.Mock;
const mockGetDeployment = ServicesService.getDeployment as jest.Mock;
const mockWithTimeout = delayModule.withTimeout as jest.Mock;
const mockSleepAwareDelay = delayModule.sleepAwareDelay as jest.Mock;

const makeHookParams = () => ({
  runningAgentTypeRef: { current: AgentMap.PredictTrader as AgentType | null },
  recordMetric: jest.fn(),
  logMessage: jest.fn(),
  logVerbose: jest.fn(),
});

describe('useAutoRunStopOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: sleepAwareDelay always returns true (no sleep/wake)
    mockSleepAwareDelay.mockResolvedValue(true);
    // Default: withTimeout delegates to the actual promise
    mockWithTimeout.mockImplementation((promise: Promise<unknown>) => promise);
  });

  it('returns true when deployment reports stopped on first poll', async () => {
    mockStopDeployment.mockResolvedValue(undefined);
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.STOPPED,
    });

    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunStopOperations(params));

    let stopResult: boolean | undefined;
    await act(async () => {
      stopResult = await result.current.stopAgentWithRecovery(
        AgentMap.PredictTrader,
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    expect(stopResult).toBe(true);
    expect(params.recordMetric).not.toHaveBeenCalled();
  });

  it('returns true via local fallback when runningAgentType changes', async () => {
    mockStopDeployment.mockResolvedValue(undefined);
    // Deployment poll interrupted by sleep/wake
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.DEPLOYED,
    });
    mockSleepAwareDelay.mockResolvedValue(false);

    const params = makeHookParams();
    // Local fallback: running agent changed to something else
    params.runningAgentTypeRef.current = AgentMap.Optimus;

    const { result } = renderHook(() => useAutoRunStopOperations(params));

    let stopResult: boolean | undefined;
    await act(async () => {
      stopResult = await result.current.stopAgentWithRecovery(
        AgentMap.PredictTrader,
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    expect(stopResult).toBe(true);
    expect(params.logVerbose).toHaveBeenCalledWith(
      expect.stringContaining('local_fallback_ok'),
    );
  });

  it('records stopTimeouts metric after all recovery attempts fail', async () => {
    mockStopDeployment.mockResolvedValue(undefined);
    // Deployment stays active, poll returns false (sleep/wake), no local fallback
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.DEPLOYED,
    });
    // sleepAwareDelay: poll loops return false (break), retry delays return true
    let callCount = 0;
    mockSleepAwareDelay.mockImplementation(async () => {
      callCount += 1;
      // Odd calls are poll waits (5s), even calls are retry delays (60s)
      // Pattern per attempt: poll-wait(false), then retry-delay(true)
      // 3 attempts = 6 calls total, last 2 are for the 3rd attempt (no retry after)
      return callCount % 2 === 0;
    });

    const params = makeHookParams();
    params.runningAgentTypeRef.current = AgentMap.PredictTrader;

    const { result } = renderHook(() => useAutoRunStopOperations(params));

    let stopResult: boolean | undefined;
    await act(async () => {
      stopResult = await result.current.stopAgentWithRecovery(
        AgentMap.PredictTrader,
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    expect(stopResult).toBe(false);
    expect(params.recordMetric).toHaveBeenCalledWith('stopTimeouts');
  });

  it('handles stop request error and still checks deployment', async () => {
    // Stop call throws but deployment check shows stopped
    mockWithTimeout.mockRejectedValueOnce(new Error('Stop timeout'));
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.STOPPED,
    });

    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunStopOperations(params));

    let stopResult: boolean | undefined;
    await act(async () => {
      stopResult = await result.current.stopAgentWithRecovery(
        AgentMap.PredictTrader,
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    expect(stopResult).toBe(true);
    expect(params.logMessage).toHaveBeenCalledWith(
      expect.stringContaining('stop_request'),
    );
  });

  it('returns false when sleep/wake interrupts retry delay', async () => {
    mockStopDeployment.mockResolvedValue(undefined);
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.DEPLOYED,
    });
    // All sleepAwareDelay calls return false
    mockSleepAwareDelay.mockResolvedValue(false);

    const params = makeHookParams();
    params.runningAgentTypeRef.current = AgentMap.PredictTrader;

    const { result } = renderHook(() => useAutoRunStopOperations(params));

    let stopResult: boolean | undefined;
    await act(async () => {
      stopResult = await result.current.stopAgentWithRecovery(
        AgentMap.PredictTrader,
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    // Returns false because retry delay also fails
    expect(stopResult).toBe(false);
  });

  it('logs verbose deployment poll errors', async () => {
    mockStopDeployment.mockResolvedValue(undefined);
    mockGetDeployment.mockRejectedValueOnce(new Error('Network error'));
    // After error, next poll succeeds with stopped status
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.STOPPED,
    });

    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunStopOperations(params));

    let stopResult: boolean | undefined;
    await act(async () => {
      stopResult = await result.current.stopAgentWithRecovery(
        AgentMap.PredictTrader,
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    expect(stopResult).toBe(true);
    expect(params.logVerbose).toHaveBeenCalledWith(
      expect.stringContaining('poll_error'),
    );
  });
});
