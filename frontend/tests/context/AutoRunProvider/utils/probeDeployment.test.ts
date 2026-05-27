import { probeDeploymentStatus } from '../../../../context/AutoRunProvider/utils/probeDeployment';
import { ServicesService } from '../../../../service/Services';
import { DEFAULT_SERVICE_CONFIG_ID } from '../../../helpers/factories';

jest.mock('../../../../service/Services', () => ({
  ServicesService: {
    getDeployment: jest.fn(),
  },
}));

const mockGetDeployment = ServicesService.getDeployment as jest.Mock;

describe('probeDeploymentStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('forwards serviceConfigId and an AbortSignal to ServicesService.getDeployment', async () => {
    mockGetDeployment.mockResolvedValue({ status: 3 });

    const result = await probeDeploymentStatus(DEFAULT_SERVICE_CONFIG_ID);

    expect(result).toEqual({ status: 3 });
    expect(mockGetDeployment).toHaveBeenCalledTimes(1);
    const callArg = mockGetDeployment.mock.calls[0][0];
    expect(callArg.serviceConfigId).toBe(DEFAULT_SERVICE_CONFIG_ID);
    expect(callArg.signal).toBeInstanceOf(AbortSignal);
  });

  it('aborts the in-flight request when DEPLOYMENT_CHECK_TIMEOUT_MS elapses', async () => {
    let capturedSignal: AbortSignal | undefined;
    mockGetDeployment.mockImplementation(
      ({ signal }: { signal: AbortSignal }) => {
        capturedSignal = signal;
        return new Promise(() => {
          /* never resolves */
        });
      },
    );

    const promise = probeDeploymentStatus(DEFAULT_SERVICE_CONFIG_ID);

    // Advance past the 15s internal timeout — signal must be aborted.
    jest.advanceTimersByTime(15_001);
    await Promise.resolve();

    expect(capturedSignal?.aborted).toBe(true);
    // Caller doesn't need to await; abort just signals the in-flight fetch.
    void promise.catch(() => {
      /* may settle later */
    });
  });

  it('re-throws when ServicesService.getDeployment rejects (so callers can decide to fall through)', async () => {
    mockGetDeployment.mockRejectedValue(new Error('boom'));

    await expect(
      probeDeploymentStatus(DEFAULT_SERVICE_CONFIG_ID),
    ).rejects.toThrow('boom');
  });
});
