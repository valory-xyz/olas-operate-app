import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { SettingsContext } from '../../context/SettingsProvider';
import { useSettings } from '../../hooks/useSettings';

describe('useSettings', () => {
  it('returns the SettingsContext value', () => {
    const goto = jest.fn();
    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        SettingsContext.Provider,
        { value: { screen: 'Main', goto } },
        children,
      );

    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.screen).toBe('Main');
    expect(result.current.goto).toBe(goto);
  });
});
