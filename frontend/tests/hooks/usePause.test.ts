import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { usePause } from '../../hooks/usePause';

describe('usePause', () => {
  it('initializes with paused = false', () => {
    const { result } = renderHook(() => usePause());
    expect(result.current.paused).toBe(false);
  });

  it('setPaused(true) sets paused to true', () => {
    const { result } = renderHook(() => usePause());

    act(() => {
      result.current.setPaused(true);
    });
    expect(result.current.paused).toBe(true);
  });

  it('setPaused(false) sets paused back to false', () => {
    const { result } = renderHook(() => usePause());

    act(() => {
      result.current.setPaused(true);
    });
    expect(result.current.paused).toBe(true);

    act(() => {
      result.current.setPaused(false);
    });
    expect(result.current.paused).toBe(false);
  });

  it('togglePaused toggles from false to true', () => {
    const { result } = renderHook(() => usePause());
    expect(result.current.paused).toBe(false);

    act(() => {
      result.current.togglePaused();
    });
    expect(result.current.paused).toBe(true);
  });

  it('togglePaused toggles from true to false', () => {
    const { result } = renderHook(() => usePause());

    act(() => {
      result.current.setPaused(true);
    });
    expect(result.current.paused).toBe(true);

    act(() => {
      result.current.togglePaused();
    });
    expect(result.current.paused).toBe(false);
  });

  it('multiple toggles alternate the paused state', () => {
    const { result } = renderHook(() => usePause());

    act(() => {
      result.current.togglePaused();
    });
    expect(result.current.paused).toBe(true);

    act(() => {
      result.current.togglePaused();
    });
    expect(result.current.paused).toBe(false);

    act(() => {
      result.current.togglePaused();
    });
    expect(result.current.paused).toBe(true);
  });

  it('returns stable function references across renders', () => {
    const { result, rerender } = renderHook(() => usePause());
    const firstSetPaused = result.current.setPaused;
    const firstTogglePaused = result.current.togglePaused;

    rerender();
    expect(result.current.setPaused).toBe(firstSetPaused);
    expect(result.current.togglePaused).toBe(firstTogglePaused);
  });
});
