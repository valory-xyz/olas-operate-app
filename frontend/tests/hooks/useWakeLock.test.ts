import { renderHook } from '@testing-library/react';

import { useStore } from '../../hooks/useStore';
import { useWakeLock } from '../../hooks/useWakeLock';

const mockStart = jest.fn();
const mockStop = jest.fn();

jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => ({
    wakeLock: { start: mockStart, stop: mockStop },
  }),
}));

jest.mock('../../hooks/useStore', () => ({
  useStore: jest.fn(),
}));

const mockUseStore = useStore as jest.Mock;

describe('useWakeLock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls wakeLock.start when enabled=true and keepDeviceAwake=true', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: true },
    });

    renderHook(() => useWakeLock(true));

    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockStop).not.toHaveBeenCalled();
  });

  it('does not call wakeLock.start when enabled=true but keepDeviceAwake=false', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: false },
    });

    const { unmount } = renderHook(() => useWakeLock(true));

    expect(mockStart).not.toHaveBeenCalled();

    // Cleanup should also not call stop since lock was never started
    unmount();
    expect(mockStop).not.toHaveBeenCalled();
  });

  it('does not call wakeLock.start when keepDeviceAwake=true but enabled=false', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: true },
    });

    const { unmount } = renderHook(() => useWakeLock(false));

    expect(mockStart).not.toHaveBeenCalled();

    // Cleanup should also not call stop since lock was never started
    unmount();
    expect(mockStop).not.toHaveBeenCalled();
  });

  it('calls wakeLock.start when shouldLock flips false → true via enabled', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: true },
    });

    const { rerender } = renderHook(({ enabled }) => useWakeLock(enabled), {
      initialProps: { enabled: false },
    });

    expect(mockStart).not.toHaveBeenCalled();

    // Flip enabled to true — effect should fire start
    rerender({ enabled: true });

    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('calls wakeLock.start when shouldLock flips false → true via keepDeviceAwake', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: false },
    });

    const { rerender } = renderHook(() => useWakeLock(true));

    expect(mockStart).not.toHaveBeenCalled();

    // Flip keepDeviceAwake to true
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: true },
    });

    rerender();

    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('calls wakeLock.stop on cleanup when enabled flips to false', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: true },
    });

    const { rerender } = renderHook(({ enabled }) => useWakeLock(enabled), {
      initialProps: { enabled: true },
    });

    mockStop.mockClear();

    // Flip enabled to false — effect cleanup should call stop
    rerender({ enabled: false });

    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  it('calls wakeLock.stop on cleanup when keepDeviceAwake flips to false', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: true },
    });

    const { rerender } = renderHook(() => useWakeLock(true));

    mockStop.mockClear();

    // Flip keepDeviceAwake to false
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: false },
    });

    rerender();

    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  it('calls wakeLock.stop on unmount', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: true },
    });

    const { unmount } = renderHook(() => useWakeLock(true));

    mockStop.mockClear();
    unmount();

    expect(mockStop).toHaveBeenCalledTimes(1);
  });
});
