import { renderHook, act } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { PAGES } from '../../constants/pages';
import {
  PageStateContext,
  PageStateProvider,
} from '../../context/PageStateProvider';

jest.mock('usehooks-ts', () => ({
  useTimeout: jest.fn(),
}));

import { useTimeout } from 'usehooks-ts';

const mockUseTimeout = useTimeout as jest.Mock;

const wrapper = ({ children }: PropsWithChildren) =>
  React.createElement(PageStateProvider, null, children);

const usePageStateContext = () => React.useContext(PageStateContext);

describe('PageStateProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTimeout.mockImplementation(() => {});
  });

  it('starts with Setup page state', () => {
    const { result } = renderHook(() => usePageStateContext(), { wrapper });
    expect(result.current.pageState).toBe(PAGES.Setup);
  });

  it('starts with isUserLoggedIn as false', () => {
    const { result } = renderHook(() => usePageStateContext(), { wrapper });
    expect(result.current.isUserLoggedIn).toBe(false);
  });

  it('starts with isPageLoadedAndOneMinutePassed as false', () => {
    const { result } = renderHook(() => usePageStateContext(), { wrapper });
    expect(result.current.isPageLoadedAndOneMinutePassed).toBe(false);
  });

  it('updates page state via setPageState', () => {
    const { result } = renderHook(() => usePageStateContext(), { wrapper });
    act(() => result.current.setPageState(PAGES.Main));
    expect(result.current.pageState).toBe(PAGES.Main);
  });

  it('sets isUserLoggedIn to true via setUserLoggedIn', () => {
    const { result } = renderHook(() => usePageStateContext(), { wrapper });
    act(() => result.current.setUserLoggedIn());
    expect(result.current.isUserLoggedIn).toBe(true);
  });

  it('passes null delay to useTimeout when on Setup page', () => {
    renderHook(() => usePageStateContext(), { wrapper });
    expect(mockUseTimeout).toHaveBeenCalledWith(expect.any(Function), null);
  });

  it('passes ONE_MINUTE_INTERVAL delay when page is not Setup and timer has not fired', () => {
    const { result } = renderHook(() => usePageStateContext(), { wrapper });
    act(() => result.current.setPageState(PAGES.Main));

    // After re-render, useTimeout should be called with 60000
    const lastCall = mockUseTimeout.mock.calls[mockUseTimeout.mock.calls.length - 1];
    expect(lastCall[1]).toBe(60_000);
  });
});
