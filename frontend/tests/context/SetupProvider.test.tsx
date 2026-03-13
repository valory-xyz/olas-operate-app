import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren, useContext } from 'react';

import { SETUP_SCREEN } from '../../constants/setupScreen';
import { SetupContext, SetupProvider } from '../../context/SetupProvider';

describe('SetupProvider', () => {
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(SetupProvider, null, children);

  it('provides initial state with Welcome screen and null prevState', () => {
    const { result } = renderHook(
      () => {
        return useContext(SetupContext);
      },
      { wrapper },
    );

    expect(result.current.setupObject.state).toBe(SETUP_SCREEN.Welcome);
    expect(result.current.setupObject.prevState).toBeNull();
    expect(result.current.setupObject.backupSigner).toBeUndefined();
  });

  it('updates state via setSetupObject', () => {
    const { result } = renderHook(
      () => {
        return useContext(SetupContext);
      },
      { wrapper },
    );

    act(() => {
      result.current.setSetupObject({
        state: SETUP_SCREEN.SetupPassword,
        prevState: SETUP_SCREEN.Welcome,
        backupSigner: undefined,
      });
    });
    expect(result.current.setupObject.state).toBe(SETUP_SCREEN.SetupPassword);
    expect(result.current.setupObject.prevState).toBe(SETUP_SCREEN.Welcome);
  });

  it('default context setSetupObject is a no-op', () => {
    const { result } = renderHook(() => {
      return useContext(SetupContext);
    });

    // Without provider, the default is a no-op function
    expect(() =>
      result.current.setSetupObject({
        state: SETUP_SCREEN.Loading,
        prevState: null,
      }),
    ).not.toThrow();
  });
});
