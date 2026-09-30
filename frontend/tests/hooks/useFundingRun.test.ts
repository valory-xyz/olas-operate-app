import { act, renderHook, waitFor } from '@testing-library/react';

import { FIVE_SECONDS_INTERVAL } from '../../constants/intervals';
import { useFundingRun } from '../../hooks/useFundingRun';
import {
  FundingRunRequestError,
  FundingRunService,
} from '../../service/FundingRun';
import { FUNDING_RUN_BASE_USDC, makeFundingRun } from '../helpers/factories';
import { createQueryClientWrapper } from '../helpers/queryClient';

jest.mock('../../service/FundingRun', () => ({
  ...jest.requireActual('../../service/FundingRun'),
  FundingRunService: {
    getSources: jest.fn(),
    getActive: jest.fn(),
    create: jest.fn(),
    refreshQuote: jest.fn(),
    retry: jest.fn(),
    cancel: jest.fn(),
  },
}));

const mockService = FundingRunService as jest.Mocked<typeof FundingRunService>;

const CREATE_REQUEST = {
  mode: 'onboard' as const,
  source: { chain: 'base' as const, token: FUNDING_RUN_BASE_USDC },
  destination: { chain: 'polygon' as const },
  service_config_id: 'sc-1',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockService.getSources.mockResolvedValue({ base: [FUNDING_RUN_BASE_USDC] });
  mockService.getActive.mockResolvedValue(null);
});

describe('useFundingRun', () => {
  it('exposes the active run and the sources', async () => {
    const run = makeFundingRun();
    mockService.getActive.mockResolvedValue(run);

    const { result } = renderHook(() => useFundingRun(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.activeRun).toEqual(run));
    expect(result.current.sources).toEqual({ base: [FUNDING_RUN_BASE_USDC] });
  });

  it('polls the active run', async () => {
    jest.useFakeTimers();
    try {
      renderHook(() => useFundingRun(), {
        wrapper: createQueryClientWrapper(),
      });
      await waitFor(() =>
        expect(mockService.getActive).toHaveBeenCalledTimes(1),
      );

      await act(async () => {
        jest.advanceTimersByTime(FIVE_SECONDS_INTERVAL);
      });

      await waitFor(() =>
        expect(mockService.getActive).toHaveBeenCalledTimes(2),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('writes the created run into the active run without waiting for a poll', async () => {
    const created = makeFundingRun({ id: 'fr-created' });
    mockService.create.mockResolvedValue(created);

    const { result } = renderHook(() => useFundingRun(), {
      wrapper: createQueryClientWrapper(),
    });
    await waitFor(() => expect(result.current.isActiveRunFetched).toBe(true));

    await act(async () => {
      await result.current.createMutation.mutateAsync(CREATE_REQUEST);
    });

    await waitFor(() => expect(result.current.activeRun).toEqual(created));
    expect(mockService.getActive).toHaveBeenCalledTimes(1);
  });

  it('refetches the active run when create conflicts with a live run', async () => {
    const live = makeFundingRun({ status: 'PROCESSING' });
    mockService.create.mockRejectedValue(
      new FundingRunRequestError('conflict', 409),
    );

    const { result } = renderHook(() => useFundingRun(), {
      wrapper: createQueryClientWrapper(),
    });
    await waitFor(() => expect(result.current.isActiveRunFetched).toBe(true));
    mockService.getActive.mockResolvedValue(live);

    await act(async () => {
      await result.current.createMutation
        .mutateAsync(CREATE_REQUEST)
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.activeRun).toEqual(live));
  });

  it('refreshQuote forces a re-quote and stores the result', async () => {
    const run = makeFundingRun();
    const refreshed = makeFundingRun({ quote: null });
    mockService.getActive.mockResolvedValue(run);
    mockService.refreshQuote.mockResolvedValue(refreshed);

    const { result } = renderHook(() => useFundingRun(), {
      wrapper: createQueryClientWrapper(),
    });
    await waitFor(() => expect(result.current.activeRun).toEqual(run));

    await act(async () => {
      await result.current.refreshQuoteMutation.mutateAsync(run.id);
    });

    expect(mockService.refreshQuote).toHaveBeenCalledWith(run.id, true);
    await waitFor(() => expect(result.current.activeRun).toEqual(refreshed));
  });

  it('retry stores the resumed run', async () => {
    const failed = makeFundingRun({
      status: 'FAILED',
      error: { step_id: 'bridge', message: 'x' },
    });
    const resumed = makeFundingRun({ status: 'PROCESSING' });
    mockService.getActive.mockResolvedValue(failed);
    mockService.retry.mockResolvedValue(resumed);

    const { result } = renderHook(() => useFundingRun(), {
      wrapper: createQueryClientWrapper(),
    });
    await waitFor(() => expect(result.current.activeRun).toEqual(failed));

    await act(async () => {
      await result.current.retryMutation.mutateAsync(failed.id);
    });

    expect(mockService.retry).toHaveBeenCalledWith(failed.id);
    await waitFor(() => expect(result.current.activeRun).toEqual(resumed));
  });
});
