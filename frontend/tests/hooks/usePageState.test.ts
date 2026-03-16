import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { PAGES } from '../../constants';
import { PageStateContext } from '../../context/PageStateProvider';
import { usePageState } from '../../hooks/usePageState';

const mockSetPageState = jest.fn();
const mockSetUserLoggedIn = jest.fn();

const defaultContextValue = {
  pageState: PAGES.Setup,
  setPageState: mockSetPageState,
  isPageLoadedAndOneMinutePassed: false,
  isUserLoggedIn: false,
  setUserLoggedIn: mockSetUserLoggedIn,
};

const createWrapper = (overrides: Partial<typeof defaultContextValue> = {}) => {
  const Wrapper = ({ children }: PropsWithChildren) =>
    createElement(
      PageStateContext.Provider,
      { value: { ...defaultContextValue, ...overrides } },
      children,
    );
  return Wrapper;
};

describe('usePageState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all PageStateContext values plus a goto function', () => {
    const { result } = renderHook(() => usePageState(), {
      wrapper: createWrapper(),
    });

    expect(result.current.pageState).toBe(PAGES.Setup);
    expect(result.current.setPageState).toBe(mockSetPageState);
    expect(result.current.isPageLoadedAndOneMinutePassed).toBe(false);
    expect(result.current.isUserLoggedIn).toBe(false);
    expect(result.current.setUserLoggedIn).toBe(mockSetUserLoggedIn);
    expect(typeof result.current.goto).toBe('function');
  });

  it('goto delegates to setPageState with the given page', () => {
    const { result } = renderHook(() => usePageState(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.goto(PAGES.Main);
    });

    expect(mockSetPageState).toHaveBeenCalledTimes(1);
    expect(mockSetPageState).toHaveBeenCalledWith(PAGES.Main);
  });
});
