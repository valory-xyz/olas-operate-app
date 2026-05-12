import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { PAGES, SETUP_SCREEN } from '../../constants';
import { PageStateContext } from '../../context/PageStateProvider';
import { SetupContext } from '../../context/SetupProvider';
import { useEnterAccountRecoveryFromMain } from '../../hooks/useEnterAccountRecoveryFromMain';

const makeWrapper = (overrides: {
  setSetupObject?: jest.Mock;
  setPageState?: jest.Mock;
}) => {
  const setSetupObject = overrides.setSetupObject ?? jest.fn();
  const setPageState = overrides.setPageState ?? jest.fn();

  const Wrapper = ({ children }: PropsWithChildren) =>
    createElement(
      SetupContext.Provider,
      {
        value: {
          setupObject: {
            state: SETUP_SCREEN.Welcome,
            prevState: null,
            backupSigner: undefined,
          },
          setSetupObject,
          password: null,
          setPassword: jest.fn(),
        },
      },
      createElement(
        PageStateContext.Provider,
        {
          value: {
            pageState: PAGES.Main,
            setPageState,
            navParams: {},
            setNavParams: jest.fn(),
            isPageLoadedAndOneMinutePassed: false,
            isUserLoggedIn: true,
            setUserLoggedIn: jest.fn(),
          },
        },
        children,
      ),
    );
  return Wrapper;
};

describe('useEnterAccountRecoveryFromMain', () => {
  it('calls goto(AccountRecovery) then gotoPage(Setup) in order', () => {
    const setSetupObject = jest.fn();
    const setPageState = jest.fn();

    const { result } = renderHook(() => useEnterAccountRecoveryFromMain(), {
      wrapper: makeWrapper({ setSetupObject, setPageState }),
    });

    act(() => {
      result.current();
    });

    // useSetup.goto sets the setup screen to AccountRecovery
    expect(setSetupObject).toHaveBeenCalledWith(expect.any(Function));
    const updater = setSetupObject.mock.calls[0][0];
    const newState = updater({
      state: SETUP_SCREEN.Welcome,
      prevState: null,
    });
    expect(newState.state).toBe(SETUP_SCREEN.AccountRecovery);
    expect(newState.prevState).toBe(SETUP_SCREEN.Welcome);

    // usePageState.goto sets the page to Setup
    expect(setPageState).toHaveBeenCalledWith(PAGES.Setup);
  });
});
