import { renderHook, waitFor } from '@testing-library/react';

import { WEB3AUTH_STATUS_URL } from '../../constants/urls';
import { useWeb3AuthStatus } from '../../hooks/useWeb3AuthStatus';
import { createQueryClientWrapper } from '../helpers/queryClient';

const mockFetchResponse = (body: unknown, ok = true, status = 200) =>
  (global.fetch as jest.Mock).mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });

const render = () =>
  renderHook(() => useWeb3AuthStatus(), {
    wrapper: createQueryClientWrapper(),
  });

describe('useWeb3AuthStatus', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
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

  it('is disabled when the request fails', async () => {
    mockFetchResponse({}, false, 500);

    const { result } = render();

    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 5000,
    });
    expect(result.current.isWeb3AuthEnabled).toBe(false);
  });

  it('is disabled for a malformed response', async () => {
    mockFetchResponse({ enabled: 'true' });

    const { result } = render();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isWeb3AuthEnabled).toBe(false);
  });
});
