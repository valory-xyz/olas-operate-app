import { renderHook, act } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { PAGES } from '../../constants/pages';
import { PageStateContext } from '../../context/PageStateProvider';
import { usePageState } from '../../hooks/usePageState';

const mockSetPageState = jest.fn();

const wrapper = ({ children }: PropsWithChildren) =>
  React.createElement(
    PageStateContext.Provider,
    {
      value: {
        pageState: PAGES.Main,
        setPageState: mockSetPageState,
        isPageLoadedAndOneMinutePassed: false,
        isUserLoggedIn: true,
        setUserLoggedIn: jest.fn(),
      },
    },
    children,
  );

describe('usePageState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes pageState from context', () => {
    const { result } = renderHook(() => usePageState(), { wrapper });
    expect(result.current.pageState).toBe(PAGES.Main);
  });

  it('exposes isUserLoggedIn from context', () => {
    const { result } = renderHook(() => usePageState(), { wrapper });
    expect(result.current.isUserLoggedIn).toBe(true);
  });

  it('exposes isPageLoadedAndOneMinutePassed from context', () => {
    const { result } = renderHook(() => usePageState(), { wrapper });
    expect(result.current.isPageLoadedAndOneMinutePassed).toBe(false);
  });

  it('goto calls setPageState with the given page', () => {
    const { result } = renderHook(() => usePageState(), { wrapper });
    act(() => result.current.goto(PAGES.Settings));
    expect(mockSetPageState).toHaveBeenCalledWith(PAGES.Settings);
  });

  it('goto can navigate to Setup', () => {
    const { result } = renderHook(() => usePageState(), { wrapper });
    act(() => result.current.goto(PAGES.Setup));
    expect(mockSetPageState).toHaveBeenCalledWith(PAGES.Setup);
  });
});
