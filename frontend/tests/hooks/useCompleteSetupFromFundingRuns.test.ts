import { act, renderHook, waitFor } from '@testing-library/react';

import { AgentMap } from '../../constants/agent';
import {
  COMPLETED_ONBOARD_POLL_SECONDS,
  useCompleteSetupFromFundingRuns,
} from '../../hooks/useCompleteSetupFromFundingRuns';
import { FundingRunService } from '../../service/FundingRun';
import { PearlStore } from '../../types/ElectronApi';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeService,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../helpers/factories';
import { createQueryClientWrapper } from '../helpers/queryClient';

jest.mock('../../service/FundingRun', () => ({
  FundingRunService: { getCompletedOnboardRuns: jest.fn() },
}));

const mockIsLoggedIn = jest.fn();
const mockIsOnline = jest.fn();
const mockServices = jest.fn();
const mockStoreState = jest.fn();
const mockSetInstanceInitiallyFunded = jest.fn();
const mockLogMessage = jest.fn();

jest.mock('../../hooks/usePageState', () => ({
  usePageState: () => ({ isUserLoggedIn: mockIsLoggedIn() }),
}));
jest.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatusContext: () => ({ isOnline: mockIsOnline() }),
}));
jest.mock('../../hooks/useServices', () => ({
  useServices: () => ({ services: mockServices() }),
}));
jest.mock('../../hooks/useStore', () => ({
  useStore: () => ({ storeState: mockStoreState() }),
}));
jest.mock('../../hooks/useIsInitiallyFunded', () => ({
  useIsInitiallyFunded: () => ({
    isInstanceInitiallyFunded: (serviceConfigId: string, agentType: string) => {
      const stored = (mockStoreState() as Partial<PearlStore>)?.[
        agentType as keyof PearlStore
      ] as { isInitialFunded?: unknown } | undefined;
      const record = stored?.isInitialFunded;
      if (typeof record === 'boolean') return record;
      return (
        (record as Record<string, boolean> | undefined)?.[serviceConfigId] ===
        true
      );
    },
    setInstanceInitiallyFunded: mockSetInstanceInitiallyFunded,
  }),
}));
jest.mock('../../context/AutoRunProvider/hooks/useLogAutoRunEvent', () => ({
  useLogAutoRunEvent: () => ({ logMessage: mockLogMessage }),
}));
jest.mock('../../context/AutoRunProvider/utils/utils', () => ({
  getAgentFromService: () => ['trader', {}],
}));

const mockService = FundingRunService as jest.Mocked<typeof FundingRunService>;

const unfinishedStore = (
  record: Record<string, boolean> | boolean,
): Partial<PearlStore> =>
  ({
    [AgentMap.PredictTrader]: { isInitialFunded: record },
  }) as Partial<PearlStore>;

const run = (serviceConfigId: string) => ({
  service_config_id: serviceConfigId,
  run_id: `fr-${serviceConfigId}`,
  finished_at: 1_790_000_000,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockIsLoggedIn.mockReturnValue(true);
  mockIsOnline.mockReturnValue(true);
  mockServices.mockReturnValue([
    makeService({ service_config_id: DEFAULT_SERVICE_CONFIG_ID }),
    makeService({ service_config_id: MOCK_SERVICE_CONFIG_ID_2 }),
  ]);
  mockStoreState.mockReturnValue(
    unfinishedStore({
      [DEFAULT_SERVICE_CONFIG_ID]: false,
      [MOCK_SERVICE_CONFIG_ID_2]: true,
    }),
  );
  mockService.getCompletedOnboardRuns.mockResolvedValue({ runs: [] });
});

describe('useCompleteSetupFromFundingRuns', () => {
  it('asks about unfinished agents only, in one batch', async () => {
    renderHook(() => useCompleteSetupFromFundingRuns(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() =>
      expect(mockService.getCompletedOnboardRuns).toHaveBeenCalledWith([
        DEFAULT_SERVICE_CONFIG_ID,
      ]),
    );
  });

  it('marks setup complete for each returned run and logs it', async () => {
    mockService.getCompletedOnboardRuns.mockResolvedValue({
      runs: [run(DEFAULT_SERVICE_CONFIG_ID)],
    });

    renderHook(() => useCompleteSetupFromFundingRuns(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() =>
      expect(mockSetInstanceInitiallyFunded).toHaveBeenCalledWith(
        DEFAULT_SERVICE_CONFIG_ID,
        AgentMap.PredictTrader,
      ),
    );
    expect(mockLogMessage).toHaveBeenCalledWith(
      `setup complete from funding run fr-${DEFAULT_SERVICE_CONFIG_ID}: ${DEFAULT_SERVICE_CONFIG_ID}`,
    );
  });

  it('leaves agents the middleware returns no run for unfinished', async () => {
    renderHook(() => useCompleteSetupFromFundingRuns(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() =>
      expect(mockService.getCompletedOnboardRuns).toHaveBeenCalled(),
    );
    expect(mockSetInstanceInitiallyFunded).not.toHaveBeenCalled();
  });

  it('sends no request when every agent is complete', async () => {
    mockStoreState.mockReturnValue(
      unfinishedStore({
        [DEFAULT_SERVICE_CONFIG_ID]: true,
        [MOCK_SERVICE_CONFIG_ID_2]: true,
      }),
    );

    renderHook(() => useCompleteSetupFromFundingRuns(), {
      wrapper: createQueryClientWrapper(),
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockService.getCompletedOnboardRuns).not.toHaveBeenCalled();
  });

  it('skips an agent type still on the legacy boolean', async () => {
    mockStoreState.mockReturnValue(unfinishedStore(false));

    renderHook(() => useCompleteSetupFromFundingRuns(), {
      wrapper: createQueryClientWrapper(),
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockService.getCompletedOnboardRuns).not.toHaveBeenCalled();
  });

  it('waits for login', async () => {
    mockIsLoggedIn.mockReturnValue(false);

    renderHook(() => useCompleteSetupFromFundingRuns(), {
      wrapper: createQueryClientWrapper(),
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockService.getCompletedOnboardRuns).not.toHaveBeenCalled();
  });

  describe('failed requests', () => {
    const fetchErrorLogs = () =>
      mockLogMessage.mock.calls.filter(([message]) =>
        String(message).startsWith(
          'completed onboard funding runs fetch error:',
        ),
      );

    const pollOnce = async (expectedCalls: number) => {
      await act(async () => {
        jest.advanceTimersByTime(COMPLETED_ONBOARD_POLL_SECONDS * 1000);
      });
      await waitFor(() =>
        expect(mockService.getCompletedOnboardRuns).toHaveBeenCalledTimes(
          expectedCalls,
        ),
      );
    };

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('logs one line for a run of failures', async () => {
      mockService.getCompletedOnboardRuns.mockRejectedValue(
        new Error('Not Found'),
      );

      renderHook(() => useCompleteSetupFromFundingRuns(), {
        wrapper: createQueryClientWrapper(),
      });
      await waitFor(() => expect(fetchErrorLogs()).toHaveLength(1));
      await pollOnce(2);
      await pollOnce(3);

      expect(fetchErrorLogs()).toEqual([
        ['completed onboard funding runs fetch error: Error: Not Found'],
      ]);
    });

    it('logs again when failures resume after a success', async () => {
      mockService.getCompletedOnboardRuns
        .mockRejectedValueOnce(new Error('Not Found'))
        .mockResolvedValueOnce({ runs: [] })
        .mockRejectedValueOnce(new Error('Not Found'));

      renderHook(() => useCompleteSetupFromFundingRuns(), {
        wrapper: createQueryClientWrapper(),
      });
      await waitFor(() => expect(fetchErrorLogs()).toHaveLength(1));
      await pollOnce(2);
      await pollOnce(3);

      await waitFor(() => expect(fetchErrorLogs()).toHaveLength(2));
    });
  });

  it('asks again every poll interval while an agent is unfinished', async () => {
    jest.useFakeTimers();
    try {
      renderHook(() => useCompleteSetupFromFundingRuns(), {
        wrapper: createQueryClientWrapper(),
      });
      await waitFor(() =>
        expect(mockService.getCompletedOnboardRuns).toHaveBeenCalledTimes(1),
      );

      await act(async () => {
        jest.advanceTimersByTime(COMPLETED_ONBOARD_POLL_SECONDS * 1000);
      });

      await waitFor(() =>
        expect(mockService.getCompletedOnboardRuns).toHaveBeenCalledTimes(2),
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
