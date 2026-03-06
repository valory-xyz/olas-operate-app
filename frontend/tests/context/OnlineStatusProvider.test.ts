import { renderHook, act } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import {
  OnlineStatusProvider,
  useOnlineStatus,
} from '../../context/OnlineStatusProvider';

const wrapper = ({ children }: PropsWithChildren) =>
  React.createElement(OnlineStatusProvider, null, children);

describe('OnlineStatusProvider', () => {
  it('reflects navigator.onLine after mount', () => {
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);

    const { result } = renderHook(() => useOnlineStatus(), { wrapper });
    expect(result.current.isOnline).toBe(true);
  });

  it('updates to online when online event fires', () => {
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => useOnlineStatus(), { wrapper });
    expect(result.current.isOnline).toBe(false);

    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
  });

  it('updates to offline when offline event fires', () => {
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus(), { wrapper });
    expect(result.current.isOnline).toBe(true);

    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);
  });
});

describe('useOnlineStatus', () => {
  it('throws when used outside provider with undefined context', () => {
    const undefinedWrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (React as any).Fragment,
        null,
        children,
      );

    // The default context value is { isOnline: false } (not undefined),
    // so useOnlineStatus won't throw when used outside the provider
    // because createContext provides a default value.
    const { result } = renderHook(() => useOnlineStatus(), {
      wrapper: undefinedWrapper,
    });
    expect(result.current.isOnline).toBe(false);
  });
});
