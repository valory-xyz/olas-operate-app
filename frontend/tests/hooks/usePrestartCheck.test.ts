import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import {
  isPrestartCheckBlocking,
  prestartCheckQuery,
  usePrestartCheck,
} from '../../hooks/usePrestartCheck';
import { ServicesService } from '../../service/Services';
import { PrestartCheckResult } from '../../types/Agent';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeFailedPrestartCheck,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../helpers/factories';
import { createTestQueryClient } from '../helpers/queryClient';

jest.mock('../../service/Services', () => ({
  ServicesService: { getPrestartCheck: jest.fn() },
}));

const mockGetPrestartCheck = ServicesService.getPrestartCheck as jest.Mock;

const FAILED = makeFailedPrestartCheck();

const renderUsePrestartCheck = (
  queryClient: QueryClient,
  serviceConfigId?: string,
) =>
  renderHook(() => usePrestartCheck(serviceConfigId), {
    wrapper: ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });

describe('isPrestartCheckBlocking', () => {
  it.each([
    ['failed', true],
    ['error', true],
    ['passed', false],
    ['not_supported', false],
  ] as const)('%s blocks the start: %s', (status, expected) => {
    expect(isPrestartCheckBlocking({ status, issues: [] })).toBe(expected);
  });

  it('does not block before any check ran', () => {
    expect(isPrestartCheckBlocking(undefined)).toBe(false);
  });
});

describe('prestartCheckQuery', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the middleware result', async () => {
    mockGetPrestartCheck.mockResolvedValue(FAILED);
    const result = await prestartCheckQuery(
      DEFAULT_SERVICE_CONFIG_ID,
    ).queryFn();

    expect(result).toEqual(FAILED);
    expect(mockGetPrestartCheck).toHaveBeenCalledWith(
      DEFAULT_SERVICE_CONFIG_ID,
    );
  });

  it('turns a failed request into an error result instead of throwing', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockGetPrestartCheck.mockRejectedValue(new Error('Failed to fetch'));

    await expect(
      prestartCheckQuery(DEFAULT_SERVICE_CONFIG_ID).queryFn(),
    ).resolves.toEqual({
      status: 'error',
      issues: [],
      detail: 'Failed to fetch',
    });
    consoleSpy.mockRestore();
  });
});

describe('usePrestartCheck', () => {
  beforeEach(() => jest.clearAllMocks());

  it('has no result before a start ran the check, and never runs it', () => {
    const queryClient = createTestQueryClient();
    const { result } = renderUsePrestartCheck(
      queryClient,
      DEFAULT_SERVICE_CONFIG_ID,
    );

    expect(result.current).toEqual({ result: undefined, isChecking: false });
    expect(mockGetPrestartCheck).not.toHaveBeenCalled();
  });

  it('follows the check a start runs for the same service', async () => {
    let resolveCheck: (value: PrestartCheckResult) => void = () => {};
    mockGetPrestartCheck.mockReturnValue(
      new Promise((resolve) => {
        resolveCheck = resolve;
      }),
    );
    const queryClient = createTestQueryClient();
    const { result } = renderUsePrestartCheck(
      queryClient,
      DEFAULT_SERVICE_CONFIG_ID,
    );

    let check: Promise<PrestartCheckResult> = Promise.resolve(FAILED);
    act(() => {
      check = queryClient.fetchQuery(
        prestartCheckQuery(DEFAULT_SERVICE_CONFIG_ID),
      );
    });
    await waitFor(() => expect(result.current.isChecking).toBe(true));

    await act(async () => {
      resolveCheck(FAILED);
      await check;
    });
    await waitFor(() =>
      expect(result.current).toEqual({ result: FAILED, isChecking: false }),
    );
  });

  it('keeps the last result after every reader unmounts', async () => {
    mockGetPrestartCheck.mockResolvedValue(FAILED);
    const queryClient = createTestQueryClient();
    const { unmount } = renderUsePrestartCheck(
      queryClient,
      DEFAULT_SERVICE_CONFIG_ID,
    );
    await act(async () => {
      await queryClient.fetchQuery(
        prestartCheckQuery(DEFAULT_SERVICE_CONFIG_ID),
      );
    });

    unmount();
    await new Promise((r) => setTimeout(r, 10));

    expect(
      renderUsePrestartCheck(queryClient, DEFAULT_SERVICE_CONFIG_ID).result
        .current.result,
    ).toEqual(FAILED);
  });

  it("ignores another service's check", async () => {
    mockGetPrestartCheck.mockResolvedValue(FAILED);
    const queryClient = createTestQueryClient();
    const { result } = renderUsePrestartCheck(
      queryClient,
      DEFAULT_SERVICE_CONFIG_ID,
    );

    await act(async () => {
      await queryClient.fetchQuery(
        prestartCheckQuery(MOCK_SERVICE_CONFIG_ID_2),
      );
    });
    expect(result.current.result).toBeUndefined();
  });

  it('has no result without a service', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(prestartCheckQuery('').queryKey, FAILED);
    const { result } = renderUsePrestartCheck(queryClient);

    expect(result.current.result).toBeUndefined();
  });
});
