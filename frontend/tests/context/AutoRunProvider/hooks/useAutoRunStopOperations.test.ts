import { renderHook } from '@testing-library/react';
import { act } from 'react';

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
  runningServiceConfigIdRef: {
    current: DEFAULT_SERVICE_CONFIG_ID as string | null,
  },
  recordMetric: jest.fn(),
  logMessage: jest.fn(),
  logVerbose: jest.fn(),
});

describe('useAutoRunStopOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSleepAwareDelay.mockResolvedValue(true);
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
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    expect(stopResult).toBe(true);
    expect(params.recordMetric).not.toHaveBeenCalled();
  });

  it('returns true via local fallback when runningServiceConfigId changes', async () => {
    mockStopDeployment.mockResolvedValue(undefined);
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.DEPLOYED,
    });
    mockSleepAwareDelay.mockResolvedValue(false);

    const params = makeHookParams();
    // Local fallback: running instance changed to something else
    params.runningServiceConfigIdRef.current = 'sc-other';

    const { result } = renderHook(() => useAutoRunStopOperations(params));

    let stopResult: boolean | undefined;
    await act(async () => {
      stopResult = await result.current.stopAgentWithRecovery(
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
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.DEPLOYED,
    });
    let callCount = 0;
    mockSleepAwareDelay.mockImplementation(async () => {
      callCount += 1;
      return callCount % 2 === 0;
    });

    const params = makeHookParams();
    params.runningServiceConfigIdRef.current = DEFAULT_SERVICE_CONFIG_ID;

    const { result } = renderHook(() => useAutoRunStopOperations(params));

    let stopResult: boolean | undefined;
    await act(async () => {
      stopResult = await result.current.stopAgentWithRecovery(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    expect(stopResult).toBe(false);
    expect(params.recordMetric).toHaveBeenCalledWith('stopTimeouts');
  });

  it('handles stop request error and still checks deployment', async () => {
    mockWithTimeout.mockRejectedValueOnce(new Error('Stop timeout'));
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.STOPPED,
    });

    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunStopOperations(params));

    let stopResult: boolean | undefined;
    await act(async () => {
      stopResult = await result.current.stopAgentWithRecovery(
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
    mockSleepAwareDelay.mockResolvedValue(false);

    const params = makeHookParams();
    params.runningServiceConfigIdRef.current = DEFAULT_SERVICE_CONFIG_ID;

    const { result } = renderHook(() => useAutoRunStopOperations(params));

    let stopResult: boolean | undefined;
    await act(async () => {
      stopResult = await result.current.stopAgentWithRecovery(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    expect(stopResult).toBe(false);
  });

  it('logs verbose deployment poll errors', async () => {
    mockStopDeployment.mockResolvedValue(undefined);
    mockGetDeployment.mockRejectedValueOnce(new Error('Network error'));
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.STOPPED,
    });

    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunStopOperations(params));

    let stopResult: boolean | undefined;
    await act(async () => {
      stopResult = await result.current.stopAgentWithRecovery(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    expect(stopResult).toBe(true);
    expect(params.logVerbose).toHaveBeenCalledWith(
      expect.stringContaining('poll_error'),
    );
  });
});
