import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { OnRampContext } from '../../context/OnRampProvider';
import { useOnRampContext } from '../../hooks/useOnRampContext';

describe('useOnRampContext', () => {
  it('returns the OnRampContext value when provided', () => {
    const contextValue = { isOnRamping: false };
    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        OnRampContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(() => useOnRampContext(), { wrapper });
    expect(result.current).toBe(contextValue);
  });

  it('throws when used outside OnRampProvider', () => {
    const nullWrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        OnRampContext.Provider,
        { value: null as unknown as Record<string, unknown> },
        children,
      );

    expect(() =>
      renderHook(() => useOnRampContext(), { wrapper: nullWrapper }),
    ).toThrow('useOnRampContext must be used within OnRampProvider');
  });
});
