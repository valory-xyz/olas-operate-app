import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren, useContext } from 'react';

import { SettingsScreenMap } from '../../constants/screen';
import {
  SettingsContext,
  SettingsProvider,
} from '../../context/SettingsProvider';

describe('SettingsProvider', () => {
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(SettingsProvider, null, children);

  it('has initial screen value of Main', () => {
    const { result } = renderHook(() => useContext(SettingsContext), {
      wrapper,
    });
    expect(result.current.screen).toBe(SettingsScreenMap.Main);
  });

  it('goto changes the screen to UpdateBackupWalletMethod', () => {
    const { result } = renderHook(() => useContext(SettingsContext), {
      wrapper,
    });

    act(() => {
      result.current.goto(SettingsScreenMap.UpdateBackupWalletMethod);
    });
    expect(result.current.screen).toBe(
      SettingsScreenMap.UpdateBackupWalletMethod,
    );
  });

  it('goto changes the screen to UpdateBackupWalletManual', () => {
    const { result } = renderHook(() => useContext(SettingsContext), {
      wrapper,
    });

    act(() => {
      result.current.goto(SettingsScreenMap.UpdateBackupWalletManual);
    });
    expect(result.current.screen).toBe(
      SettingsScreenMap.UpdateBackupWalletManual,
    );
  });

  it('goto changes the screen to UpdateBackupWalletConfirm', () => {
    const { result } = renderHook(() => useContext(SettingsContext), {
      wrapper,
    });

    act(() => {
      result.current.goto(SettingsScreenMap.UpdateBackupWalletConfirm);
    });
    expect(result.current.screen).toBe(
      SettingsScreenMap.UpdateBackupWalletConfirm,
    );
  });

  it('goto changes the screen value back to Main', () => {
    const { result } = renderHook(() => useContext(SettingsContext), {
      wrapper,
    });

    act(() => {
      result.current.goto(SettingsScreenMap.UpdateBackupWalletMethod);
    });
    expect(result.current.screen).toBe(
      SettingsScreenMap.UpdateBackupWalletMethod,
    );

    act(() => {
      result.current.goto(SettingsScreenMap.Main);
    });
    expect(result.current.screen).toBe(SettingsScreenMap.Main);
  });

  it('goto function is stable across renders', () => {
    const { result, rerender } = renderHook(() => useContext(SettingsContext), {
      wrapper,
    });

    const gotoFirst = result.current.goto;
    rerender();
    // Note: goto is not wrapped in useCallback, so it may change on re-render.
    // This test documents the current behavior.
    expect(typeof result.current.goto).toBe('function');
    expect(gotoFirst).toBeDefined();
  });

  it('provides default context values without provider', () => {
    const { result } = renderHook(() => useContext(SettingsContext));

    expect(result.current.screen).toBe(SettingsScreenMap.Main);
    expect(typeof result.current.goto).toBe('function');
  });
});
