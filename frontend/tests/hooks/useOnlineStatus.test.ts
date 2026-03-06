import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { OnlineStatusContext } from '../../context/OnlineStatusProvider';
import { useOnlineStatusContext } from '../../hooks/useOnlineStatus';

describe('useOnlineStatusContext', () => {
  it('returns the OnlineStatusContext value', () => {
    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        OnlineStatusContext.Provider,
        { value: { isOnline: true } },
        children,
      );

    const { result } = renderHook(() => useOnlineStatusContext(), { wrapper });
    expect(result.current.isOnline).toBe(true);
  });

  it('returns default isOnline=false without provider', () => {
    const { result } = renderHook(() => useOnlineStatusContext());
    expect(result.current.isOnline).toBe(false);
  });
});
