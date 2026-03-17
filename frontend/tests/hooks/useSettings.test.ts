import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { SettingsContext } from '../../context/SettingsProvider';
import { useSettings } from '../../hooks/useSettings';

describe('useSettings', () => {
  it('returns the value provided by SettingsContext', () => {
    const mockGoto = jest.fn();
    const contextValue = { screen: 'Main' as const, goto: mockGoto };

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        SettingsContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(() => useSettings(), { wrapper });

    expect(result.current.screen).toBe('Main');
    expect(result.current.goto).toBe(mockGoto);
  });

  it('returns the default context value when no provider wraps it', () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.screen).toBe('Main');
    expect(typeof result.current.goto).toBe('function');
  });
});
