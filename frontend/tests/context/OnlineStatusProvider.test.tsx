import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import {
  OnlineStatusContext,
  OnlineStatusProvider,
  useOnlineStatus,
} from '../../context/OnlineStatusProvider';

describe('OnlineStatusProvider', () => {
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(OnlineStatusProvider, null, children);

  it('sets initial isOnline state based on navigator.onLine', () => {
    // jsdom defaults navigator.onLine to true
    const { result } = renderHook(
      () => {
        const ctx = useOnlineStatus();
        return ctx;
      },
      { wrapper },
    );
    expect(result.current.isOnline).toBe(navigator.onLine);
  });

  it('updates to false when offline event fires', () => {
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);

    const { result } = renderHook(() => useOnlineStatus(), { wrapper });
    expect(result.current.isOnline).toBe(true);

    // Simulate going offline
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('updates to true when online event fires', () => {
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    const { result } = renderHook(() => useOnlineStatus(), { wrapper });
    expect(result.current.isOnline).toBe(false);

    // Simulate going online
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('cleans up event listeners on unmount', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlineStatus(), { wrapper });

    // Check listeners were added
    const onlineCalls = addSpy.mock.calls.filter(
      ([event]) => event === 'online',
    );
    const offlineCalls = addSpy.mock.calls.filter(
      ([event]) => event === 'offline',
    );
    expect(onlineCalls.length).toBeGreaterThanOrEqual(1);
    expect(offlineCalls.length).toBeGreaterThanOrEqual(1);
    unmount();

    // Check listeners were removed
    const removeOnlineCalls = removeSpy.mock.calls.filter(
      ([event]) => event === 'online',
    );
    const removeOfflineCalls = removeSpy.mock.calls.filter(
      ([event]) => event === 'offline',
    );
    expect(removeOnlineCalls.length).toBeGreaterThanOrEqual(1);
    expect(removeOfflineCalls.length).toBeGreaterThanOrEqual(1);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('throws when useOnlineStatus receives undefined context', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    // Provide undefined as the context value to trigger the guard
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        OnlineStatusContext.Provider,
        { value: undefined as unknown as { isOnline: boolean } },
        children,
      );

    expect(() => {
      renderHook(() => useOnlineStatus(), { wrapper });
    }).toThrow('useOnlineStatus must be used within an OnlineStatusProvider');

    consoleSpy.mockRestore();
  });
});
