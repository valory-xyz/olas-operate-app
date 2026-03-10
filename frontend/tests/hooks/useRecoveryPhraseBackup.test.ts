import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { useRecoveryPhraseBackup } from '../../hooks/useRecoveryPhraseBackup';
import { useStore } from '../../hooks/useStore';

const mockStoreSet = jest.fn();

jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => ({
    store: { set: mockStoreSet },
  }),
}));

jest.mock('../../hooks/useStore', () => ({
  useStore: jest.fn(),
}));

const mockUseStore = useStore as jest.Mock;

describe('useRecoveryPhraseBackup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isBackedUp as true when store has recoveryPhraseBackedUp = true', () => {
    mockUseStore.mockReturnValue({
      storeState: { recoveryPhraseBackedUp: true },
    });

    const { result } = renderHook(() => useRecoveryPhraseBackup());
    expect(result.current.isBackedUp).toBe(true);
  });

  it('returns isBackedUp as false when store has recoveryPhraseBackedUp = false', () => {
    mockUseStore.mockReturnValue({
      storeState: { recoveryPhraseBackedUp: false },
    });

    const { result } = renderHook(() => useRecoveryPhraseBackup());
    expect(result.current.isBackedUp).toBe(false);
  });

  it('returns isBackedUp as false when store has no recoveryPhraseBackedUp', () => {
    mockUseStore.mockReturnValue({ storeState: {} });

    const { result } = renderHook(() => useRecoveryPhraseBackup());
    expect(result.current.isBackedUp).toBe(false);
  });

  it('coerces undefined to false via !! operator', () => {
    mockUseStore.mockReturnValue({ storeState: undefined });

    const { result } = renderHook(() => useRecoveryPhraseBackup());
    expect(result.current.isBackedUp).toBe(false);
  });

  it('markAsBackedUp calls store.set when not already backed up', () => {
    mockUseStore.mockReturnValue({
      storeState: { recoveryPhraseBackedUp: false },
    });

    const { result } = renderHook(() => useRecoveryPhraseBackup());
    act(() => {
      result.current.markAsBackedUp();
    });

    expect(mockStoreSet).toHaveBeenCalledWith('recoveryPhraseBackedUp', true);
  });

  it('markAsBackedUp is a no-op when already backed up (one-way setter)', () => {
    mockUseStore.mockReturnValue({
      storeState: { recoveryPhraseBackedUp: true },
    });

    const { result } = renderHook(() => useRecoveryPhraseBackup());
    act(() => {
      result.current.markAsBackedUp();
    });

    expect(mockStoreSet).not.toHaveBeenCalled();
  });
});
