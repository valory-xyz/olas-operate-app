import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';

import { WEB3AUTH_STATUS_URL } from '../../constants/urls';
import { useWeb3AuthStatus } from '../../hooks/useWeb3AuthStatus';
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from '../helpers/queryClient';

const mockFetchResponse = (body: unknown, ok = true, status = 200) =>
  (global.fetch as jest.Mock).mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });

const render = () =>
  renderHook(() => useWeb3AuthStatus(), {
    wrapper: createQueryClientWrapper(),
  });

describe('useWeb3AuthStatus', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest
      .spyOn(window.console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls the pearl-api status route', async () => {
    mockFetchResponse({ enabled: true });

    const { result } = render();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
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

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isWeb3AuthEnabled).toBe(false);
  });

  it('is disabled while loading', () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = render();

    expect(result.current.isLoading).toBe(true);
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

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isWeb3AuthEnabled).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('is disabled for a malformed response', async () => {
    mockFetchResponse({ enabled: 'true' });

    const { result } = render();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isWeb3AuthEnabled).toBe(false);
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
  });

  it('turns disabled when a refetch fails after an earlier enabled read', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
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
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    onlineManager.setOnline(false);

    try {
      const { result } = renderHook(() => useWeb3AuthStatus(), { wrapper });
      expect(result.current.status).toBe('loading');
      expect(result.current.isLoading).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });
});
