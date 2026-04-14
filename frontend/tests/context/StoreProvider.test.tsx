import { renderHook, waitFor } from '@testing-library/react';
import { createElement, PropsWithChildren, useContext } from 'react';

import { ElectronApiContext } from '../../context/ElectronApiProvider';
import {
  registerPearlStoreDeleteHandler,
  registerPearlStoreSetHandler,
} from '../../context/pearlStoreEventBus';
import { StoreContext, StoreProvider } from '../../context/StoreProvider';
import { StoreService } from '../../service/StoreService';
import { PearlStore } from '../../types/ElectronApi';

jest.mock('../../service/StoreService', () => ({
  StoreService: {
    getStore: jest.fn(),
    setStoreKey: jest.fn(),
    deleteStoreKey: jest.fn(),
  },
}));

// Mock the event bus — capture registered handlers so tests can invoke them.
jest.mock('../../context/pearlStoreEventBus', () => ({
  registerPearlStoreSetHandler: jest.fn(),
  registerPearlStoreDeleteHandler: jest.fn(),
  emitPearlStoreSet: jest.fn(),
  emitPearlStoreDelete: jest.fn(),
}));

const mockGetStore = StoreService.getStore as jest.Mock;
const mockRegisterSet = registerPearlStoreSetHandler as jest.Mock;
const mockRegisterDelete = registerPearlStoreDeleteHandler as jest.Mock;

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
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to hydrate pearl store:',
        storeError,
      );
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

  it('retries hydration on failure and succeeds on subsequent attempt', async () => {
    jest.useFakeTimers();

    const mockStoreData: PearlStore = { firstStakingRewardAchieved: true };
    const storeError = new Error('backend unavailable');
    mockGetStore
      .mockRejectedValueOnce(storeError)
      .mockResolvedValueOnce(mockStoreData);

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useContext(StoreContext), {
      wrapper: makeWrapper(),
    });

    // First attempt fails
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to hydrate pearl store:',
        storeError,
      );
    });
    expect(result.current.storeState).toBeUndefined();

    // Advance past retry delay (3 seconds)
    jest.advanceTimersByTime(3000);

    // Second attempt succeeds
    await waitFor(() => {
      expect(result.current.storeState).toEqual(mockStoreData);
    });

    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  it('stops retrying after max retries are exhausted', async () => {
    jest.useFakeTimers();

    const storeError = new Error('backend permanently down');
    mockGetStore.mockRejectedValue(storeError);

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useContext(StoreContext), {
      wrapper: makeWrapper(),
    });

    // Initial attempt + 3 retries = 4 total calls
    for (let i = 0; i < 3; i++) {
      await waitFor(() => {
        expect(mockGetStore).toHaveBeenCalledTimes(i + 1);
      });
      jest.advanceTimersByTime(3000);
    }

    await waitFor(() => {
      expect(mockGetStore).toHaveBeenCalledTimes(4);
    });

    // No more retries — stays undefined
    jest.advanceTimersByTime(10000);
    expect(mockGetStore).toHaveBeenCalledTimes(4);
    expect(result.current.storeState).toBeUndefined();

    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  it('queues writes that arrive before hydration and applies them after', async () => {
    // Delay hydration so we can inject writes before it resolves.
    let resolveGetStore!: (data: PearlStore) => void;
    mockGetStore.mockReturnValue(
      new Promise<PearlStore>((resolve) => {
        resolveGetStore = resolve;
      }),
    );

    const { result } = renderHook(() => useContext(StoreContext), {
      wrapper: makeWrapper(),
    });

    // storeState is undefined — hydration hasn't resolved yet.
    expect(result.current.storeState).toBeUndefined();

    // Simulate a write arriving before hydration via the registered event bus handler.
    const setHandler = mockRegisterSet.mock.calls[0][0] as (
      key: string,
      value: unknown,
    ) => void;
    setHandler('autoRun', { enabled: true });

    // storeState is still undefined — write was queued, not dropped.
    expect(result.current.storeState).toBeUndefined();

    // Now resolve hydration with backend data.
    resolveGetStore({ firstStakingRewardAchieved: true });

    // After hydration, the queued write is applied on top of backend data.
    await waitFor(() => {
      expect(result.current.storeState).toEqual({
        firstStakingRewardAchieved: true,
        autoRun: { enabled: true },
      });
    });
  });

  it('queues deletes that arrive before hydration and applies them after', async () => {
    let resolveGetStore!: (data: PearlStore) => void;
    mockGetStore.mockReturnValue(
      new Promise<PearlStore>((resolve) => {
        resolveGetStore = resolve;
      }),
    );

    const { result } = renderHook(() => useContext(StoreContext), {
      wrapper: makeWrapper(),
    });

    // Simulate a delete arriving before hydration.
    const deleteHandler = mockRegisterDelete.mock.calls[0][0] as (
      key: string,
    ) => void;
    deleteHandler('firstStakingRewardAchieved');

    // Resolve hydration with data that includes the key to be deleted.
    resolveGetStore({
      firstStakingRewardAchieved: true,
      lastSelectedServiceConfigId: 'svc-1',
    });

    // After hydration, the queued delete is applied — key is removed.
    await waitFor(() => {
      expect(result.current.storeState).toEqual({
        lastSelectedServiceConfigId: 'svc-1',
      });
    });
  });
});
