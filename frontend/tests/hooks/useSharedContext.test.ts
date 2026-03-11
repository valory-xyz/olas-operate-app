import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { SharedContext } from '../../context/SharedProvider/SharedProvider';
import { useSharedContext } from '../../hooks/useSharedContext';

describe('useSharedContext', () => {
  it('throws when used outside a SharedContext provider', () => {
    // SharedContext default value is a non-null object, so to trigger the
    // null check we need to explicitly provide null/undefined.
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        SharedContext.Provider,
        { value: undefined as never },
        children,
      );

    // Suppress React error boundary console.error noise during throw test
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => renderHook(() => useSharedContext(), { wrapper })).toThrow(
      'useSharedContext must be used within SharedContext',
    );
    consoleErrorSpy.mockRestore();
  });

  it('returns the context value when used inside a SharedContext provider', () => {
    const mockSetMainOlasBalanceAnimated = jest.fn();
    const contextValue = {
      hasMainOlasBalanceAnimatedOnLoad: true,
      setMainOlasBalanceAnimated: mockSetMainOlasBalanceAnimated,
      isAgentsFunFieldUpdateRequired: false,
      isAccountRecoveryStatusLoading: false,
      hasActiveRecoverySwap: false,
    };

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(SharedContext.Provider, { value: contextValue }, children);

    const { result } = renderHook(() => useSharedContext(), { wrapper });

    expect(result.current.hasMainOlasBalanceAnimatedOnLoad).toBe(true);
    expect(result.current.setMainOlasBalanceAnimated).toBe(
      mockSetMainOlasBalanceAnimated,
    );
    expect(result.current.isAgentsFunFieldUpdateRequired).toBe(false);
  });
});
