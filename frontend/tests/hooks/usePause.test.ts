import { renderHook, act } from '@testing-library/react';

import { usePause } from '../../hooks/usePause';

describe('usePause', () => {
  it('starts unpaused', () => {
    const { result } = renderHook(() => usePause());
    expect(result.current.paused).toBe(false);
  });

  it('sets paused to true via setPaused', () => {
    const { result } = renderHook(() => usePause());
    act(() => result.current.setPaused(true));
    expect(result.current.paused).toBe(true);
  });

  it('sets paused back to false via setPaused', () => {
    const { result } = renderHook(() => usePause());
    act(() => result.current.setPaused(true));
    act(() => result.current.setPaused(false));
    expect(result.current.paused).toBe(false);
  });

  it('toggles from false to true', () => {
    const { result } = renderHook(() => usePause());
    act(() => result.current.togglePaused());
    expect(result.current.paused).toBe(true);
  });

  it('toggles from true back to false', () => {
    const { result } = renderHook(() => usePause());
    act(() => result.current.togglePaused());
    act(() => result.current.togglePaused());
    expect(result.current.paused).toBe(false);
  });
});
