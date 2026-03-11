import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { useMnemonicExists } from '../../hooks/useMnemonicExists';
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

describe('useMnemonicExists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns mnemonicExists from store state', () => {
    mockUseStore.mockReturnValue({
      storeState: { mnemonicExists: true },
    });

    const { result } = renderHook(() => useMnemonicExists());
    expect(result.current.mnemonicExists).toBe(true);
  });

  it('returns undefined when storeState has no mnemonicExists', () => {
    mockUseStore.mockReturnValue({ storeState: {} });

    const { result } = renderHook(() => useMnemonicExists());
    expect(result.current.mnemonicExists).toBeUndefined();
  });

  it('returns undefined when storeState is undefined', () => {
    mockUseStore.mockReturnValue({ storeState: undefined });

    const { result } = renderHook(() => useMnemonicExists());
    expect(result.current.mnemonicExists).toBeUndefined();
  });

  it('calls store.set with true when setMnemonicExists(true) is called', () => {
    mockUseStore.mockReturnValue({ storeState: {} });

    const { result } = renderHook(() => useMnemonicExists());
    act(() => {
      result.current.setMnemonicExists(true);
    });
    expect(mockStoreSet).toHaveBeenCalledWith('mnemonicExists', true);
  });

  it('calls store.set with false when setMnemonicExists(false) is called', () => {
    mockUseStore.mockReturnValue({
      storeState: { mnemonicExists: true },
    });

    const { result } = renderHook(() => useMnemonicExists());
    act(() => {
      result.current.setMnemonicExists(false);
    });
    expect(mockStoreSet).toHaveBeenCalledWith('mnemonicExists', false);
  });

  it('returns false when storeState.mnemonicExists is false', () => {
    mockUseStore.mockReturnValue({
      storeState: { mnemonicExists: false },
    });

    const { result } = renderHook(() => useMnemonicExists());
    expect(result.current.mnemonicExists).toBe(false);
  });
});
