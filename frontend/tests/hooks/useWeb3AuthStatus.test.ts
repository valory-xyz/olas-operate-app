import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';

import { WEB3AUTH_STATUS_URL } from '../../constants/urls';
import {
  useLatchedWeb3AuthEnabled,
  useWeb3AuthStatus,
} from '../../hooks/useWeb3AuthStatus';
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from '../helpers/queryClient';

const mockLogEvent = jest.fn();
jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => ({ logEvent: mockLogEvent }),
}));

const mockFetchResponse = (body: unknown, ok = true, status = 200) =>
  (global.fetch as jest.Mock).mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });

/** A fresh QueryClient and a wrapper around it, for tests that drive the cache. */
const withQueryClient = () => {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
};

const render = () =>
  renderHook(() => useWeb3AuthStatus(), {
    wrapper: createQueryClientWrapper(),
  });

describe('useWeb3AuthStatus', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockLogEvent.mockClear();
  });

  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest
      .spyOn(window.console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('calls the pearl-api status route', async () => {
    mockFetchResponse({ enabled: true });

    const { result } = render();

    await waitFor(() => expect(result.current.status).not.toBe('loading'));
    expect(global.fetch).toHaveBeenCalledWith(
      WEB3AUTH_STATUS_URL,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('is enabled when pearl-api reports enabled: true', async () => {
    mockFetchResponse({ enabled: true });

    const { result } = render();

    await waitFor(() => expect(result.current.isWeb3AuthEnabled).toBe(true));
  });

  it('is disabled when pearl-api reports enabled: false', async () => {
    mockFetchResponse({ enabled: false });

    const { result } = render();

    await waitFor(() => expect(result.current.status).not.toBe('loading'));
    expect(result.current.isWeb3AuthEnabled).toBe(false);
  });

  it('is disabled while loading', () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = render();

    expect(result.current.status).toBe('loading');
    expect(result.current.isWeb3AuthEnabled).toBe(false);
  });

  it('retries once, then is disabled when the request fails', async () => {
    jest.useFakeTimers();
    mockFetchResponse({}, false, 500);

    const { result } = render();

    await act(async () => {
      await jest.runAllTimersAsync();
    });
    jest.useRealTimers();

    await waitFor(() => expect(result.current.status).not.toBe('loading'));
    expect(result.current.isWeb3AuthEnabled).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('is disabled, and logs, for a malformed response', async () => {
    jest.useFakeTimers();
    mockFetchResponse({ enabled: 'true' });

    const { result } = render();
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    jest.useRealTimers();

    await waitFor(() => expect(result.current.status).toBe('disabled'));
    expect(result.current.isWeb3AuthEnabled).toBe(false);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining(WEB3AUTH_STATUS_URL),
      expect.objectContaining({
        message: expect.stringContaining('Unexpected Web3Auth status response'),
      }),
    );
  });

  it('reports isExplicitlyDisabled only for an answered enabled: false', async () => {
    mockFetchResponse({ enabled: false });
    const disabled = render();
    await waitFor(() =>
      expect(disabled.result.current.isExplicitlyDisabled).toBe(true),
    );

    jest.useFakeTimers();
    mockFetchResponse({}, false, 500);
    const failed = render();
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    jest.useRealTimers();
    await waitFor(() => expect(failed.result.current.status).toBe('disabled'));
    expect(failed.result.current.isExplicitlyDisabled).toBe(false);
  });

  it('drops isExplicitlyDisabled when a refetch fails after an answered enabled: false', async () => {
    const { queryClient, wrapper } = withQueryClient();
    mockFetchResponse({ enabled: false });

    const { result } = renderHook(() => useWeb3AuthStatus(), { wrapper });
    await waitFor(() => expect(result.current.isExplicitlyDisabled).toBe(true));

    jest.useFakeTimers();
    mockFetchResponse({}, false, 500);
    await act(async () => {
      queryClient.refetchQueries();
      await jest.runAllTimersAsync();
    });
    jest.useRealTimers();

    // React Query keeps the old { enabled: false }; the outage must not read as an answer.
    await waitFor(() => expect(result.current.status).toBe('disabled'));
    expect(result.current.isExplicitlyDisabled).toBe(false);
  });

  it('reports a three-state status', async () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    expect(render().result.current.status).toBe('loading');

    mockFetchResponse({ enabled: true });
    const enabled = render();
    await waitFor(() => expect(enabled.result.current.status).toBe('enabled'));

    mockFetchResponse({ enabled: false });
    const disabled = render();
    await waitFor(() =>
      expect(disabled.result.current.status).toBe('disabled'),
    );
  });

  it('logs a failed request with the status URL', async () => {
    jest.useFakeTimers();
    mockFetchResponse({}, false, 500);

    render();
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    jest.useRealTimers();

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining(WEB3AUTH_STATUS_URL),
        expect.any(Error),
      ),
    );
    // Also in Pearl's exported logs, with the error.
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          `${WEB3AUTH_STATUS_URL}.*Failed to fetch Web3Auth status: 500`,
        ),
      ),
    );
  });

  it('logs once per attempt, however many components read the status', async () => {
    const { wrapper } = withQueryClient();
    jest.useFakeTimers();
    mockFetchResponse({}, false, 500);

    renderHook(() => [useWeb3AuthStatus(), useWeb3AuthStatus()], { wrapper });
    renderHook(() => useWeb3AuthStatus(), { wrapper });
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    jest.useRealTimers();

    // One attempt plus one retry, shared by all three readers.
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(consoleError).toHaveBeenCalledTimes(2);
    expect(mockLogEvent).toHaveBeenCalledTimes(2);
  });

  it('turns disabled when a refetch fails after an earlier enabled read', async () => {
    const { queryClient, wrapper } = withQueryClient();
    mockFetchResponse({ enabled: true });

    const { result } = renderHook(() => useWeb3AuthStatus(), { wrapper });
    await waitFor(() => expect(result.current.isWeb3AuthEnabled).toBe(true));

    jest.useFakeTimers();
    mockFetchResponse({}, false, 500);
    await act(async () => {
      queryClient.refetchQueries();
      await jest.runAllTimersAsync();
    });
    jest.useRealTimers();

    await waitFor(() => expect(result.current.status).toBe('disabled'));
    expect(result.current.isWeb3AuthEnabled).toBe(false);
  });

  it('stays loading, not disabled, while the query is paused offline', () => {
    const { wrapper } = withQueryClient();
    onlineManager.setOnline(false);

    try {
      const { result } = renderHook(() => useWeb3AuthStatus(), { wrapper });
      expect(result.current.status).toBe('loading');
      expect(result.current.status).toBe('loading');
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('does not log a cancelled request as an outage', async () => {
    const { queryClient, wrapper } = withQueryClient();
    (global.fetch as jest.Mock).mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );

    renderHook(() => useWeb3AuthStatus(), { wrapper });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await act(async () => {
      await queryClient.cancelQueries();
    });

    expect(consoleError).not.toHaveBeenCalled();
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  describe('useLatchedWeb3AuthEnabled', () => {
    it('is undefined while the status loads', () => {
      (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
      const { wrapper } = withQueryClient();

      const { result } = renderHook(() => useLatchedWeb3AuthEnabled('a'), {
        wrapper,
      });
      expect(result.current).toBeUndefined();
    });

    it('keeps the first settled value for a key when a refetch later fails', async () => {
      const { queryClient, wrapper } = withQueryClient();
      mockFetchResponse({ enabled: true });

      const { result } = renderHook(() => useLatchedWeb3AuthEnabled('a'), {
        wrapper,
      });
      await waitFor(() => expect(result.current).toBe(true));

      jest.useFakeTimers();
      mockFetchResponse({}, false, 500);
      await act(async () => {
        queryClient.refetchQueries();
        await jest.runAllTimersAsync();
      });
      jest.useRealTimers();

      expect(result.current).toBe(true);
    });

    it('clears the decision when the key goes null, so re-entering reads the status again', async () => {
      const { queryClient, wrapper } = withQueryClient();
      mockFetchResponse({ enabled: true });

      const { result, rerender } = renderHook(
        ({ key }: { key: string | null }) => useLatchedWeb3AuthEnabled(key),
        { wrapper, initialProps: { key: 'a' as string | null } },
      );
      await waitFor(() => expect(result.current).toBe(true));

      rerender({ key: null });
      mockFetchResponse({ enabled: false });
      await act(async () => {
        await queryClient.refetchQueries();
      });

      rerender({ key: 'a' });
      await waitFor(() => expect(result.current).toBe(false));
    });

    it('reads the live status again for a new key', async () => {
      const { queryClient, wrapper } = withQueryClient();
      mockFetchResponse({ enabled: true });

      const { result, rerender } = renderHook(
        ({ key }: { key: string | null }) => useLatchedWeb3AuthEnabled(key),
        { wrapper, initialProps: { key: 'a' as string | null } },
      );
      await waitFor(() => expect(result.current).toBe(true));

      mockFetchResponse({ enabled: false });
      await act(async () => {
        await queryClient.refetchQueries();
      });
      expect(result.current).toBe(true);

      rerender({ key: 'b' });
      await waitFor(() => expect(result.current).toBe(false));
    });
  });
});
