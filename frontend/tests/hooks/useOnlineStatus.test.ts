import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { OnlineStatusContext } from '../../context/OnlineStatusProvider';
import { useOnlineStatusContext } from '../../hooks/useOnlineStatus';

describe('useOnlineStatusContext', () => {
  it('returns the value provided by OnlineStatusContext', () => {
    const contextValue = { isOnline: true };

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        OnlineStatusContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(() => useOnlineStatusContext(), { wrapper });
    expect(result.current.isOnline).toBe(true);
  });

  it('returns the default context value (isOnline: false) when no provider wraps it', () => {
    const { result } = renderHook(() => useOnlineStatusContext());
    expect(result.current.isOnline).toBe(false);
  });
});
