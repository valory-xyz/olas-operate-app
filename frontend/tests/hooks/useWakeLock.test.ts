import { renderHook } from '@testing-library/react';

import { useStore } from '../../hooks/useStore';
import { useWakeLock } from '../../hooks/useWakeLock';

const mockInvoke = jest.fn();

jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => ({
    ipcRenderer: { invoke: mockInvoke },
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

  it('calls wake-lock-start when enabled=true and keepDeviceAwake=true', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: true },
    });

    renderHook(() => useWakeLock(true));

    expect(mockInvoke).toHaveBeenCalledWith('wake-lock-start', undefined);
  });

  it('does not call wake-lock-start when enabled=true but keepDeviceAwake=false', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: false },
    });

    renderHook(() => useWakeLock(true));

    expect(mockInvoke).not.toHaveBeenCalledWith('wake-lock-start', undefined);
  });

  it('does not call wake-lock-start when keepDeviceAwake=true but enabled=false', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: true },
    });

    renderHook(() => useWakeLock(false));

    expect(mockInvoke).not.toHaveBeenCalledWith('wake-lock-start', undefined);
  });

  it('calls wake-lock-stop on cleanup when enabled flips to false', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: true },
    });

    const { rerender, unmount } = renderHook(
      ({ enabled }) => useWakeLock(enabled),
      { initialProps: { enabled: true } },
    );

    mockInvoke.mockClear();

    // Flip enabled to false — effect cleanup should call wake-lock-stop
    rerender({ enabled: false });

    expect(mockInvoke).toHaveBeenCalledWith('wake-lock-stop', undefined);
  });

  it('calls wake-lock-stop on cleanup when keepDeviceAwake flips to false', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: true },
    });

    const { rerender } = renderHook(() => useWakeLock(true));

    mockInvoke.mockClear();

    // Flip keepDeviceAwake to false
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: false },
    });

    rerender();

    expect(mockInvoke).toHaveBeenCalledWith('wake-lock-stop', undefined);
  });

  it('calls wake-lock-stop on unmount', () => {
    mockUseStore.mockReturnValue({
      storeState: { keepDeviceAwake: true },
    });

    const { unmount } = renderHook(() => useWakeLock(true));

    mockInvoke.mockClear();
    unmount();

    expect(mockInvoke).toHaveBeenCalledWith('wake-lock-stop', undefined);
  });
});
