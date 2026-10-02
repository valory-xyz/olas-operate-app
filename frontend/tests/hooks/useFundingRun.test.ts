import { act, renderHook, waitFor } from '@testing-library/react';

import { FIVE_SECONDS_INTERVAL } from '../../constants/intervals';
import { useFundingRun } from '../../hooks/useFundingRun';
import { FundingRunService } from '../../service/FundingRun';
import { FUNDING_RUN_BASE_USDC, makeFundingRun } from '../helpers/factories';
import { createQueryClientWrapper } from '../helpers/queryClient';

jest.mock('../../service/FundingRun', () => ({
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

  it('keeps the old run and stops polling while a create is in flight', async () => {
    jest.useFakeTimers();
    try {
      const old = makeFundingRun({ id: 'fr-old' });
      const created = makeFundingRun({ id: 'fr-created' });
      mockService.getActive.mockResolvedValue(old);
      let resolveCreate: (run: typeof created) => void = () => {};
      mockService.create.mockImplementation(
        () => new Promise((resolve) => (resolveCreate = resolve)),
      );

      const { result } = renderHook(() => useFundingRun(), {
        wrapper: createQueryClientWrapper(),
      });
      await waitFor(() => expect(result.current.activeRun).toEqual(old));

      // The backend cancels the old run as soon as the create arrives.
      mockService.getActive.mockResolvedValue(null);
      act(() => {
        result.current.createMutation.mutate(CREATE_REQUEST);
      });
      await waitFor(() =>
        expect(result.current.createMutation.isPending).toBe(true),
      );
      await act(async () => {
        jest.advanceTimersByTime(FIVE_SECONDS_INTERVAL * 3);
      });

      expect(mockService.getActive).toHaveBeenCalledTimes(1);
      expect(result.current.activeRun).toEqual(old);

      await act(async () => {
        resolveCreate(created);
      });
      await waitFor(() => expect(result.current.activeRun).toEqual(created));
    } finally {
      jest.useRealTimers();
    }
  });

  it.each([
    ['succeeds', () => mockService.create.mockResolvedValue(makeFundingRun())],
    ['fails', () => mockService.create.mockRejectedValue(new Error('boom'))],
  ])('resumes polling once a create %s', async (_label, arrange) => {
    jest.useFakeTimers();
    try {
      arrange();
      const { result } = renderHook(() => useFundingRun(), {
        wrapper: createQueryClientWrapper(),
      });
      await waitFor(() => expect(result.current.isActiveRunFetched).toBe(true));

      await act(async () => {
        await result.current.createMutation
          .mutateAsync(CREATE_REQUEST)
          .catch(() => undefined);
      });
      const callsAfterCreate = mockService.getActive.mock.calls.length;
      await act(async () => {
        jest.advanceTimersByTime(FIVE_SECONDS_INTERVAL);
      });

      await waitFor(() =>
        expect(mockService.getActive.mock.calls.length).toBeGreaterThan(
          callsAfterCreate,
        ),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('cancels a run that a fresh fetch shows is still only quoted', async () => {
    const run = makeFundingRun();
    mockService.getActive.mockResolvedValue(run);
    mockService.cancel.mockResolvedValue({ ...run, status: 'CANCELLED' });
    const { result } = renderHook(() => useFundingRun(), {
      wrapper: createQueryClientWrapper(),
    });

    let isGone: boolean | undefined;
    await act(async () => {
      isGone = await result.current.cancelIfOnlyQuoted(run.id);
    });

    expect(mockService.cancel).toHaveBeenCalledWith(run.id);
    expect(isGone).toBe(true);
  });

  it('does not cancel a run whose deposit arrived since the last poll', async () => {
    const run = makeFundingRun();
    const funded = makeFundingRun({
      quote: { ...run.quote!, received_amount: '1' },
    });
    mockService.getActive.mockResolvedValue(run);
    const { result } = renderHook(() => useFundingRun(), {
      wrapper: createQueryClientWrapper(),
    });
    await waitFor(() => expect(result.current.activeRun).toEqual(run));

    mockService.getActive.mockResolvedValue(funded);
    let isGone: boolean | undefined;
    await act(async () => {
      isGone = await result.current.cancelIfOnlyQuoted(run.id);
    });

    expect(mockService.cancel).not.toHaveBeenCalled();
    expect(isGone).toBe(false);
    await waitFor(() => expect(result.current.activeRun).toEqual(funded));
  });

  it('refetches the active run when create conflicts with a live run', async () => {
    const live = makeFundingRun({ status: 'PROCESSING' });
    mockService.create.mockRejectedValue(new Error('conflict'));

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

    expect(mockService.refreshQuote).toHaveBeenCalledWith(run.id);
    await waitFor(() => expect(result.current.activeRun).toEqual(refreshed));
  });

  it('retry stores the resumed run', async () => {
    const failed = makeFundingRun({
      status: 'FAILED',
      error: { step_id: 'bridge', message: 'Step failed.' },
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

  it('cancel stores the cancelled run', async () => {
    const failed = makeFundingRun({
      status: 'FAILED',
      error: { step_id: 'bridge', message: "Couldn't bridge to Polygon" },
    });
    const cancelled = { ...failed, status: 'CANCELLED' as const };
    mockService.getActive.mockResolvedValue(failed);
    mockService.cancel.mockResolvedValue(cancelled);

    const { result } = renderHook(() => useFundingRun(), {
      wrapper: createQueryClientWrapper(),
    });
    await waitFor(() => expect(result.current.activeRun).toEqual(failed));

    await act(async () => {
      await result.current.cancelMutation.mutateAsync(failed.id);
    });

    expect(mockService.cancel).toHaveBeenCalledWith(failed.id);
    await waitFor(() => expect(result.current.activeRun).toEqual(cancelled));
  });
});
