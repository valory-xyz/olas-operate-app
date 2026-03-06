import { renderHook, act } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { SettingsContext, SettingsProvider } from '../../context/SettingsProvider';

const wrapper = ({ children }: PropsWithChildren) =>
  React.createElement(SettingsProvider, null, children);

const useSettingsContext = () => React.useContext(SettingsContext);

describe('SettingsProvider', () => {
  it('starts on Main screen', () => {
    const { result } = renderHook(() => useSettingsContext(), { wrapper });
    expect(result.current.screen).toBe('Main');
  });

  it('navigates to Main via goto', () => {
    const { result } = renderHook(() => useSettingsContext(), { wrapper });
    act(() => result.current.goto('Main'));
    expect(result.current.screen).toBe('Main');
  });
});
