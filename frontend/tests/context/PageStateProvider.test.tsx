import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren, useContext } from 'react';

import { ONE_MINUTE_INTERVAL } from '../../constants/intervals';
import { PAGES } from '../../constants/pages';
import {
  PageStateContext,
  PageStateProvider,
} from '../../context/PageStateProvider';

// Mock useTimeout from usehooks-ts
const mockUseTimeout = jest.fn();
jest.mock('usehooks-ts', () => ({
  useTimeout: (...args: unknown[]) => mockUseTimeout(...args),
}));

describe('PageStateProvider', () => {
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(PageStateProvider, null, children);

  beforeEach(() => {
    mockUseTimeout.mockClear();
  });

  it('has initial pageState of Setup', () => {
    const { result } = renderHook(() => useContext(PageStateContext), {
      wrapper,
    });
    expect(result.current.pageState).toBe(PAGES.Setup);
  });

  it('setPageState changes the page', () => {
    const { result } = renderHook(() => useContext(PageStateContext), {
      wrapper,
    });

    act(() => {
      result.current.setPageState(PAGES.Main);
    });
    expect(result.current.pageState).toBe(PAGES.Main);
  });

  it('isPageLoadedAndOneMinutePassed starts false', () => {
    const { result } = renderHook(() => useContext(PageStateContext), {
      wrapper,
    });
    expect(result.current.isPageLoadedAndOneMinutePassed).toBe(false);
  });

  it('useTimeout is called with null delay when on Setup page', () => {
    renderHook(() => useContext(PageStateContext), { wrapper });

    // On initial render, pageState = Setup, so delay should be null
    expect(mockUseTimeout).toHaveBeenCalledWith(expect.any(Function), null);
  });

  it('useTimeout is called with ONE_MINUTE_INTERVAL when on non-Setup page', () => {
    const { result } = renderHook(() => useContext(PageStateContext), {
      wrapper,
    });

    // Change to a non-Setup page
    act(() => {
      result.current.setPageState(PAGES.Main);
    });

    // Find the last call to useTimeout with non-null delay
    const lastCall =
      mockUseTimeout.mock.calls[mockUseTimeout.mock.calls.length - 1];
    expect(lastCall[1]).toBe(ONE_MINUTE_INTERVAL);
  });

  it('useTimeout callback sets isPageLoadedAndOneMinutePassed to true', () => {
    const { result } = renderHook(() => useContext(PageStateContext), {
      wrapper,
    });

    // Move to non-Setup page so the timeout would be active
    act(() => {
      result.current.setPageState(PAGES.Main);
    });

    // Get the callback passed to useTimeout (last call)
    const lastCall =
      mockUseTimeout.mock.calls[mockUseTimeout.mock.calls.length - 1];
    const timeoutCallback = lastCall[0];

    // Execute the callback manually
    act(() => {
      timeoutCallback();
    });

    expect(result.current.isPageLoadedAndOneMinutePassed).toBe(true);
  });

  it('useTimeout uses null delay once isPageLoadedAndOneMinutePassed is true', () => {
    const { result } = renderHook(() => useContext(PageStateContext), {
      wrapper,
    });

    // Move to non-Setup page
    act(() => {
      result.current.setPageState(PAGES.Main);
    });

    // Execute the timeout callback to set isPageLoadedAndOneMinutePassed = true
    const callBeforeFire =
      mockUseTimeout.mock.calls[mockUseTimeout.mock.calls.length - 1];
    act(() => {
      callBeforeFire[0]();
    });

    // After the state update, useTimeout should be called with null
    const lastCall =
      mockUseTimeout.mock.calls[mockUseTimeout.mock.calls.length - 1];
    expect(lastCall[1]).toBe(null);
  });

  it('setUserLoggedIn sets isUserLoggedIn to true', () => {
    const { result } = renderHook(() => useContext(PageStateContext), {
      wrapper,
    });

    expect(result.current.isUserLoggedIn).toBe(false);
    act(() => {
      result.current.setUserLoggedIn();
    });
    expect(result.current.isUserLoggedIn).toBe(true);
  });

  it('isUserLoggedIn starts false', () => {
    const { result } = renderHook(() => useContext(PageStateContext), {
      wrapper,
    });

    expect(result.current.isUserLoggedIn).toBe(false);
  });
});
