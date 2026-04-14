import { renderHook, waitFor } from '@testing-library/react';
import { createElement, PropsWithChildren, useContext } from 'react';

import { ElectronApiContext } from '../../context/ElectronApiProvider';
import { StoreContext, StoreProvider } from '../../context/StoreProvider';
import { StoreService } from '../../service/StoreService';
import type { PearlStore } from '../../types/ElectronApi';

jest.mock('../../service/StoreService', () => ({
  StoreService: {
    getStore: jest.fn(),
    setStoreKey: jest.fn(),
    deleteStoreKey: jest.fn(),
  },
}));

// Mock the event bus to prevent module-level singleton side-effects between tests.
jest.mock('../../context/pearlStoreEventBus', () => ({
  registerPearlStoreSetHandler: jest.fn(),
  registerPearlStoreDeleteHandler: jest.fn(),
  emitPearlStoreSet: jest.fn(),
  emitPearlStoreDelete: jest.fn(),
}));

const mockGetStore = StoreService.getStore as jest.Mock;

/**
 * Wraps StoreProvider with an ElectronApiContext that reports
 * hasMigratedToBackendStore=true so the one-time migration effect is a no-op.
 */
const makeWrapper = (electronValue?: object) => {
  const Wrapper = ({ children }: PropsWithChildren) => {
    const defaultElectron = {
      store: {
        get: jest.fn().mockImplementation((key: string) =>
          // Already migrated — skip the migration branch
          Promise.resolve(
            key === 'hasMigratedToBackendStore' ? true : undefined,
          ),
        ),
        set: jest.fn().mockResolvedValue(undefined),
      },
    };
    return createElement(
      ElectronApiContext.Provider,
      { value: electronValue ?? defaultElectron },
      createElement(StoreProvider, null, children),
    );
  };
  return Wrapper;
};

describe('StoreProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads initial store state from StoreService.getStore()', async () => {
    const mockStoreData: PearlStore = {
      firstStakingRewardAchieved: true,
      lastSelectedServiceConfigId: 'trader-1',
    };
    mockGetStore.mockResolvedValue(mockStoreData);

    const { result } = renderHook(() => useContext(StoreContext), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.storeState).toEqual(mockStoreData);
    });

    expect(mockGetStore).toHaveBeenCalled();
  });

  it('provides undefined storeState before StoreService.getStore() resolves', () => {
    // Never resolves during this test
    mockGetStore.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useContext(StoreContext), {
      wrapper: makeWrapper(),
    });

    expect(result.current.storeState).toBeUndefined();
  });

  it('catches StoreService.getStore() rejection and logs to console.error', async () => {
    const storeError = new Error('store unavailable');
    mockGetStore.mockRejectedValue(storeError);

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useContext(StoreContext), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(storeError);
    });

    expect(result.current.storeState).toBeUndefined();
    consoleSpy.mockRestore();
  });

  it('provides empty storeState when StoreService.getStore() returns {}', async () => {
    mockGetStore.mockResolvedValue({});

    const { result } = renderHook(() => useContext(StoreContext), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.storeState).toEqual({});
    });
  });

  it('handles undefined store gracefully (no migration attempted)', async () => {
    mockGetStore.mockResolvedValue({});

    const { result } = renderHook(() => useContext(StoreContext), {
      wrapper: makeWrapper({ store: undefined }),
    });

    // storeState should still load from StoreService.getStore()
    await waitFor(() => {
      expect(result.current.storeState).toEqual({});
    });
  });
});
