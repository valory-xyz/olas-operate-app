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
 * Wraps StoreProvider with an ElectronApiContext.
 * Migration is a no-op when getStore returns non-empty data (most tests).
 */
const makeWrapper = (electronValue?: object) => {
  const Wrapper = ({ children }: PropsWithChildren) => {
    const defaultElectron = {
      store: {
        get: jest.fn().mockImplementation((key: string) =>
          // Migration already done — skip in most tests
          Promise.resolve(
            key === 'pearlStoreMigrationComplete' ||
              key === 'pearlStoreAutoRunRepaired'
              ? true
              : undefined,
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

  it('catches StoreService.getStore() rejection and falls back to empty store', async () => {
    jest.useFakeTimers();

    const storeError = new Error('store unavailable');
    mockGetStore.mockRejectedValue(storeError);

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useContext(StoreContext), {
      wrapper: makeWrapper(),
    });

    // Exhaust all retries
    for (let i = 0; i < 3; i++) {
      await waitFor(() => {
        expect(mockGetStore).toHaveBeenCalledTimes(i + 1);
      });
      jest.advanceTimersByTime(3000);
    }

    // After all retries, falls back to empty store
    await waitFor(() => {
      expect(result.current.storeState).toEqual({});
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[StoreProvider] Hydration attempt 1 failed:',
      storeError,
    );

    consoleSpy.mockRestore();
    jest.useRealTimers();
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
        '[StoreProvider] Hydration attempt 1 failed:',
        storeError,
      );
    });

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

    // No more retries — falls back to empty store
    await waitFor(() => {
      expect(result.current.storeState).toEqual({});
    });
    jest.advanceTimersByTime(10000);
    expect(mockGetStore).toHaveBeenCalledTimes(4);

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

    // Simulate a write arriving before hydration via the registered event bus handler.
    const setHandler = mockRegisterSet.mock.calls[0][0] as (
      key: string,
      value: unknown,
    ) => void;
    setHandler('autoRun', { enabled: true });

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

  describe('migration', () => {
    const mockSetStoreKey = StoreService.setStoreKey as jest.Mock;

    /** Wrapper where migration flags are NOT set and Electron store returns given data. */
    const makeMigrationWrapper = (electronData: Record<string, unknown>) => {
      const Wrapper = ({ children }: PropsWithChildren) => {
        const electron = {
          store: {
            get: jest
              .fn()
              .mockImplementation((key: string) =>
                Promise.resolve(electronData[key]),
              ),
            set: jest.fn().mockResolvedValue(undefined),
          },
        };
        return createElement(
          ElectronApiContext.Provider,
          { value: electron },
          createElement(StoreProvider, null, children),
        );
      };
      return Wrapper;
    };

    beforeEach(() => {
      mockSetStoreKey.mockResolvedValue(undefined);
    });

    it('phase 1: copies missing keys from Electron to backend', async () => {
      // Backend has autoRun only; Electron has autoRun + trader
      mockGetStore
        .mockResolvedValueOnce({ autoRun: { enabled: false } })
        .mockResolvedValueOnce({
          autoRun: { enabled: true },
          trader: { isInitialFunded: { 'svc-1': true } },
        });

      const { result } = renderHook(() => useContext(StoreContext), {
        wrapper: makeMigrationWrapper({
          autoRun: { enabled: true },
          trader: { isInitialFunded: { 'svc-1': true } },
        }),
      });

      await waitFor(() => {
        expect(result.current.storeState?.trader).toEqual({
          isInitialFunded: { 'svc-1': true },
        });
      });

      // trader was missing from backend → should be migrated
      expect(mockSetStoreKey).toHaveBeenCalledWith('trader', {
        isInitialFunded: { 'svc-1': true },
      });
    });

    it('phase 1: does NOT overwrite existing backend keys', async () => {
      // Backend already has trader with correct data
      mockGetStore.mockResolvedValue({
        trader: { isInitialFunded: { 'svc-1': true } },
        autoRun: { enabled: true },
      });

      const { result } = renderHook(() => useContext(StoreContext), {
        wrapper: makeMigrationWrapper({
          // Electron has DIFFERENT trader value (old boolean format)
          trader: { isInitialFunded: true },
          autoRun: { enabled: true },
          pearlStoreAutoRunRepaired: true,
        }),
      });

      // Wait for hydration + migration to complete
      await waitFor(() => {
        expect(result.current.storeState).toBeDefined();
      });

      // THEN assert trader was never written (backend already had it)
      expect(mockSetStoreKey).not.toHaveBeenCalledWith(
        'trader',
        expect.anything(),
      );
    });

    it('phase 2: repairs autoRun.enabled via dot-notation when Electron=true but backend=false', async () => {
      mockGetStore
        .mockResolvedValueOnce({ autoRun: { enabled: false } })
        .mockResolvedValueOnce({ autoRun: { enabled: true } });

      const { result } = renderHook(() => useContext(StoreContext), {
        wrapper: makeMigrationWrapper({
          autoRun: { enabled: true, isInitialized: true },
        }),
      });

      await waitFor(() => {
        expect(result.current.storeState?.autoRun?.enabled).toBe(true);
      });

      // Must use dot-notation, NOT overwrite the entire autoRun object
      expect(mockSetStoreKey).toHaveBeenCalledWith('autoRun.enabled', true);
    });

    it('phase 2: preserves backend autoRun fields that Electron lacks', async () => {
      // Backend has includedAgentInstances that Electron doesn't know about
      mockGetStore
        .mockResolvedValueOnce({
          autoRun: {
            enabled: false,
            isInitialized: true,
            includedAgentInstances: [{ serviceConfigId: 'svc-1', order: 0 }],
            userExcludedAgentInstances: ['svc-2'],
          },
        })
        .mockResolvedValueOnce({
          autoRun: {
            enabled: true,
            isInitialized: true,
            includedAgentInstances: [{ serviceConfigId: 'svc-1', order: 0 }],
            userExcludedAgentInstances: ['svc-2'],
          },
        });

      const { result } = renderHook(() => useContext(StoreContext), {
        wrapper: makeMigrationWrapper({
          // Electron has old shape without multi-instance fields
          autoRun: { enabled: true, isInitialized: true },
        }),
      });

      await waitFor(() => {
        expect(result.current.storeState?.autoRun?.enabled).toBe(true);
      });

      // Dot-notation write — backend's includedAgentInstances and
      // userExcludedAgentInstances are NOT overwritten
      expect(mockSetStoreKey).toHaveBeenCalledWith('autoRun.enabled', true);
      expect(mockSetStoreKey).not.toHaveBeenCalledWith(
        'autoRun',
        expect.anything(),
      );
    });

    it('phase 2: does NOT touch autoRun when values already match', async () => {
      mockGetStore.mockResolvedValue({
        autoRun: { enabled: true, isInitialized: true },
      });

      const { result } = renderHook(() => useContext(StoreContext), {
        wrapper: makeMigrationWrapper({
          autoRun: { enabled: true, isInitialized: true },
          pearlStoreAutoRunRepaired: true,
        }),
      });

      // Wait for hydration + migration to complete
      await waitFor(() => {
        expect(result.current.storeState).toBeDefined();
      });

      // THEN assert autoRun was never written
      expect(mockSetStoreKey).not.toHaveBeenCalledWith(
        'autoRun',
        expect.anything(),
      );
      expect(mockSetStoreKey).not.toHaveBeenCalledWith(
        'autoRun.enabled',
        expect.anything(),
      );
    });

    it('sets pearlStoreMigrationComplete flag after phase 1', async () => {
      mockGetStore.mockResolvedValue({});

      const storeSet = jest.fn().mockResolvedValue(undefined);
      const Wrapper = ({ children }: PropsWithChildren) => {
        const electron = {
          store: {
            get: jest
              .fn()
              .mockImplementation((key: string) =>
                Promise.resolve(
                  key === 'trader'
                    ? { isInitialFunded: {} }
                    : key === 'autoRun'
                      ? { enabled: false }
                      : undefined,
                ),
              ),
            set: storeSet,
          },
        };
        return createElement(
          ElectronApiContext.Provider,
          { value: electron },
          createElement(StoreProvider, null, children),
        );
      };

      renderHook(() => useContext(StoreContext), { wrapper: Wrapper });

      await waitFor(() => {
        expect(storeSet).toHaveBeenCalledWith(
          'pearlStoreMigrationComplete',
          true,
        );
        expect(storeSet).toHaveBeenCalledWith(
          'pearlStoreAutoRunRepaired',
          true,
        );
      });
    });

    it('does not set migration flag when setStoreKey fails (re-migrates next launch)', async () => {
      mockGetStore.mockResolvedValue({});
      mockSetStoreKey.mockRejectedValue(new Error('write failed'));

      const storeSet = jest.fn().mockResolvedValue(undefined);

      const Wrapper = ({ children }: PropsWithChildren) => {
        const electron = {
          store: {
            get: jest
              .fn()
              .mockImplementation((key: string) =>
                Promise.resolve(
                  key === 'trader' ? { isInitialFunded: {} } : undefined,
                ),
              ),
            set: storeSet,
          },
        };
        return createElement(
          ElectronApiContext.Provider,
          { value: electron },
          createElement(StoreProvider, null, children),
        );
      };

      renderHook(() => useContext(StoreContext), { wrapper: Wrapper });

      // Wait for migration to complete (allSettled doesn't throw)
      await waitFor(() => {
        // autoRunRepaired flag is set (Phase 2 succeeds independently)
        expect(storeSet).toHaveBeenCalledWith(
          'pearlStoreAutoRunRepaired',
          true,
        );
      });

      // Migration flag should NOT be set — partial failure retries next launch
      expect(storeSet).not.toHaveBeenCalledWith(
        'pearlStoreMigrationComplete',
        true,
      );
    });

    it('skips both phases when flags are already set', async () => {
      mockGetStore.mockResolvedValue({ autoRun: { enabled: false } });

      const { result } = renderHook(() => useContext(StoreContext), {
        wrapper: makeMigrationWrapper({
          pearlStoreMigrationComplete: true,
          pearlStoreAutoRunRepaired: true,
        }),
      });

      // Wait for hydration to complete
      await waitFor(() => {
        expect(result.current.storeState).toBeDefined();
      });

      // THEN assert no backend writes happened
      expect(mockSetStoreKey).not.toHaveBeenCalled();
    });
  });
});
