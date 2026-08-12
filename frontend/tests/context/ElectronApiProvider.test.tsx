import { render, renderHook } from '@testing-library/react';
import { get, unset } from 'lodash';
import { createElement, PropsWithChildren, useContext } from 'react';

import {
  ElectronApiContext,
  ElectronApiProvider,
} from '../../context/ElectronApiProvider';
import {
  emitPearlStoreDelete,
  emitPearlStoreSet,
} from '../../context/pearlStoreEventBus';
import {
  getPendingWriteQueue,
  resetPendingStoreWrites,
} from '../../context/pendingStoreWrites';
import { StoreService } from '../../service/StoreService';
import { makeElectronApiMock } from '../helpers/factories';

// Mock StoreService and event bus — store.set/delete/clear now route through these.
jest.mock('../../service/StoreService', () => ({
  StoreService: {
    getStore: jest.fn(),
    setStoreKey: jest.fn().mockResolvedValue(undefined),
    deleteStoreKey: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../../context/pearlStoreEventBus', () => ({
  registerPearlStoreSetHandler: jest.fn(),
  registerPearlStoreDeleteHandler: jest.fn(),
  emitPearlStoreSet: jest.fn(),
  emitPearlStoreDelete: jest.fn(),
}));

const mockSetStoreKey = StoreService.setStoreKey as jest.Mock;
const mockDeleteStoreKey = StoreService.deleteStoreKey as jest.Mock;
const mockEmitPearlStoreSet = emitPearlStoreSet as jest.Mock;
const mockEmitPearlStoreDelete = emitPearlStoreDelete as jest.Mock;

const buildMockElectronApi = makeElectronApiMock;

// store.set, store.delete, and store.clear are now wrapper functions that route
// between Electron IPC and backend HTTP, so they won't be strict-equal to the
// mock functions. These paths are tested separately below.
const OVERRIDDEN_STORE_PATHS = new Set([
  'store.set',
  'store.delete',
  'store.clear',
]);

/** Recursively collect all dot-paths to leaf (function) values. */
const getLeafPaths = (obj: Record<string, unknown>, prefix = ''): string[] => {
  const paths: string[] = [];
  for (const key of Object.keys(obj)) {
    const dotPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'function') {
      paths.push(dotPath);
    } else if (value && typeof value === 'object') {
      paths.push(...getLeafPaths(value as Record<string, unknown>, dotPath));
    }
  }
  return paths;
};

const ALL_FUNCTION_PATHS = getLeafPaths(buildMockElectronApi());

describe('ElectronApiProvider', () => {
  const originalElectronApi = (window as unknown as Record<string, unknown>)
    .electronAPI;

  afterEach(() => {
    if (originalElectronApi === undefined) {
      delete (window as unknown as Record<string, unknown>).electronAPI;
    } else {
      (window as unknown as Record<string, unknown>).electronAPI =
        originalElectronApi;
    }
  });

  it('exposes all electronAPI functions via context when window.electronAPI is present', () => {
    const mockApi = buildMockElectronApi();
    (window as unknown as Record<string, unknown>).electronAPI = mockApi;

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(ElectronApiProvider, null, children);

    const { result } = renderHook(() => useContext(ElectronApiContext), {
      wrapper,
    });

    // Passthrough functions should be strict-equal to the mock.
    const passthroughPaths = ALL_FUNCTION_PATHS.filter(
      (p) => !OVERRIDDEN_STORE_PATHS.has(p),
    );
    for (const dotPath of passthroughPaths) {
      expect(get(result.current, dotPath)).toBe(get(mockApi, dotPath));
    }
    // Overridden functions should still be callable functions.
    for (const dotPath of OVERRIDDEN_STORE_PATHS) {
      expect(typeof get(result.current, dotPath)).toBe('function');
    }
  });

  it('throws when window.electronAPI is an empty object', () => {
    (window as unknown as Record<string, unknown>).electronAPI = {};

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => {
      render(createElement(ElectronApiProvider, null, 'child'));
    }).toThrow('not found in window.electronAPI');

    consoleSpy.mockRestore();
  });

  it.each(
    ALL_FUNCTION_PATHS.filter((p) => !OVERRIDDEN_STORE_PATHS.has(p)).map(
      (p) => ({ dotPath: p }),
    ),
  )(
    'throws when $dotPath is removed from window.electronAPI',
    ({ dotPath }) => {
      const partialApi = buildMockElectronApi();
      unset(partialApi, dotPath);
      (window as unknown as Record<string, unknown>).electronAPI = partialApi;

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        render(createElement(ElectronApiProvider, null, 'child'));
      }).toThrow(`Function ${dotPath} not found in window.electronAPI`);

      consoleSpy.mockRestore();
    },
  );

  describe('store.set routing', () => {
    const setupProvider = () => {
      const mockApi = buildMockElectronApi();
      mockApi.store.set.mockResolvedValue(undefined);
      (window as unknown as Record<string, unknown>).electronAPI = mockApi;

      const { result } = renderHook(() => useContext(ElectronApiContext), {
        wrapper: ({ children }: PropsWithChildren) =>
          createElement(ElectronApiProvider, null, children),
      });
      return { result, mockApi };
    };

    it('routes Electron-native keys to IPC', async () => {
      const { result, mockApi } = setupProvider();

      await result.current.store?.set?.('environmentName', 'staging');

      expect(mockApi.store.set).toHaveBeenCalledWith(
        'environmentName',
        'staging',
      );
      expect(mockEmitPearlStoreSet).not.toHaveBeenCalled();
    });

    it('routes backend-bound keys to StoreService and event bus', async () => {
      const { result, mockApi } = setupProvider();

      await result.current.store?.set?.('trader.isInitialFunded', {
        'svc-1': true,
      });

      expect(mockApi.store.set).not.toHaveBeenCalled();
      expect(mockEmitPearlStoreSet).toHaveBeenCalledWith(
        'trader.isInitialFunded',
        { 'svc-1': true },
      );
      expect(mockSetStoreKey).toHaveBeenCalledWith('trader.isInitialFunded', {
        'svc-1': true,
      });
    });

    it('logs error when backend write fails', async () => {
      const { result } = setupProvider();
      const writeError = new Error('network error');
      mockSetStoreKey.mockRejectedValueOnce(writeError);

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await result.current.store?.set?.('autoRun', { enabled: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to persist store key 'autoRun':",
        writeError,
      );

      consoleSpy.mockRestore();
    });

    it('queues failed write to pendingStoreWrites via raw IPC', async () => {
      resetPendingStoreWrites();
      const { result, mockApi } = setupProvider();
      mockApi.store.set.mockResolvedValue(undefined);
      mockSetStoreKey.mockRejectedValueOnce(new Error('Failed to fetch'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await result.current.store?.set?.('autoRun', { enabled: false });

      // Raw IPC store.set should be called with the pending queue
      expect(mockApi.store.set).toHaveBeenCalledWith('pendingStoreWrites', [
        { key: 'autoRun', value: { enabled: false } },
      ]);

      consoleSpy.mockRestore();
    });

    it('does not queue when backend write succeeds', async () => {
      resetPendingStoreWrites();
      const { result, mockApi } = setupProvider();
      mockSetStoreKey.mockResolvedValue(undefined);

      await result.current.store?.set?.('autoRun', { enabled: true });

      // Raw IPC store.set should NOT be called with pendingStoreWrites
      const pendingCalls = mockApi.store.set.mock.calls.filter(
        (call: unknown[]) => call[0] === 'pendingStoreWrites',
      );
      expect(pendingCalls).toHaveLength(0);
    });

    it('accumulates multiple failed writes in the queue', async () => {
      resetPendingStoreWrites();
      const { result, mockApi } = setupProvider();
      mockApi.store.set.mockResolvedValue(undefined);
      mockSetStoreKey.mockRejectedValue(new Error('Failed to fetch'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await result.current.store?.set?.('autoRun', { enabled: false });
      await result.current.store?.set?.('lastSelectedServiceConfigId', 'svc-2');

      // Second IPC call should contain both entries
      const pendingCalls = mockApi.store.set.mock.calls.filter(
        (call: unknown[]) => call[0] === 'pendingStoreWrites',
      );
      expect(pendingCalls).toHaveLength(2);
      expect(pendingCalls[1][1]).toEqual([
        { key: 'autoRun', value: { enabled: false } },
        { key: 'lastSelectedServiceConfigId', value: 'svc-2' },
      ]);

      consoleSpy.mockRestore();
    });

    it('drops a queued write once a later write for the same key succeeds', async () => {
      resetPendingStoreWrites();
      const { result, mockApi } = setupProvider();
      mockApi.store.set.mockResolvedValue(undefined);

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockSetStoreKey.mockRejectedValueOnce(new Error('Failed to fetch'));
      await result.current.store?.set?.('autoRun', { enabled: false });

      // Backend recovers and the user's newer value lands.
      mockSetStoreKey.mockResolvedValueOnce(undefined);
      await result.current.store?.set?.('autoRun', { enabled: true });

      // Replaying the queued {enabled: false} would undo the write that landed.
      expect(getPendingWriteQueue()).toEqual([]);
      const pendingCalls = mockApi.store.set.mock.calls.filter(
        (call: unknown[]) => call[0] === 'pendingStoreWrites',
      );
      expect(pendingCalls[pendingCalls.length - 1][1]).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('keeps the entry in memory when persisting the queue rejects', async () => {
      resetPendingStoreWrites();
      const { result, mockApi } = setupProvider();
      const queueError = new Error('EACCES');
      mockApi.store.set.mockRejectedValue(queueError);
      mockSetStoreKey.mockRejectedValueOnce(new Error('Failed to fetch'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await result.current.store?.set?.('autoRun', { enabled: false });
      // Let the raw IPC rejection settle.
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to persist pending write queue:',
        queueError,
      );
      // Still recoverable within this session, just not across a restart.
      expect(getPendingWriteQueue()).toEqual([
        { key: 'autoRun', value: { enabled: false } },
      ]);

      consoleSpy.mockRestore();
    });

    it('reports memory-only queueing when the store.set bridge is missing', async () => {
      resetPendingStoreWrites();
      const { result, mockApi } = setupProvider();
      unset(mockApi, 'store.set');
      mockSetStoreKey.mockRejectedValueOnce(new Error('Failed to fetch'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await result.current.store?.set?.('autoRun', { enabled: false });

      // The log must not claim durability it did not get.
      const logged = mockApi.logEvent.mock.calls.map(
        (call: unknown[]) => call[0],
      );
      expect(logged).toContainEqual(expect.stringContaining('in memory only'));
      expect(logged).not.toContainEqual(
        expect.stringContaining('Enqueued failed write'),
      );

      consoleSpy.mockRestore();
    });

    it('discards a late rejection once a newer write for the key succeeded', async () => {
      resetPendingStoreWrites();
      const { result, mockApi } = setupProvider();
      mockApi.store.set.mockResolvedValue(undefined);

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // v1 hangs — fetches have no timeout, so a wedged socket rejects late.
      let rejectFirstWrite!: (error: Error) => void;
      mockSetStoreKey.mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectFirstWrite = reject;
        }),
      );
      const firstWrite = result.current.store?.set?.('autoRun', {
        enabled: false,
      });

      // The user retries; v2 lands while v1 is still in flight.
      mockSetStoreKey.mockResolvedValueOnce(undefined);
      await result.current.store?.set?.('autoRun', { enabled: true });

      // v1 finally rejects. Queueing it would revert v2 on the next launch.
      rejectFirstWrite(new TypeError('Failed to fetch'));
      await firstWrite;

      expect(getPendingWriteQueue()).toEqual([]);
      const pendingCalls = mockApi.store.set.mock.calls.filter(
        (call: unknown[]) => call[0] === 'pendingStoreWrites',
      );
      expect(pendingCalls).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it('resolves store.set only once the queue write is durable', async () => {
      resetPendingStoreWrites();
      const { result, mockApi } = setupProvider();
      mockSetStoreKey.mockRejectedValueOnce(new Error('Failed to fetch'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Hold the electron-store write open — the renderer could die here.
      let releaseQueueWrite!: () => void;
      mockApi.store.set.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          releaseQueueWrite = () => resolve();
        }),
      );

      let settled = false;
      const write = result.current.store
        ?.set?.('autoRun', { enabled: false })
        .then(() => {
          settled = true;
        });

      await Promise.resolve();
      expect(settled).toBe(false); // queue not durable yet

      releaseQueueWrite();
      await write;
      expect(settled).toBe(true);

      consoleSpy.mockRestore();
    });

    it('keeps only the latest value when the same key fails twice', async () => {
      resetPendingStoreWrites();
      const { result, mockApi } = setupProvider();
      mockApi.store.set.mockResolvedValue(undefined);
      mockSetStoreKey.mockRejectedValue(new Error('Failed to fetch'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await result.current.store?.set?.('autoRun', { enabled: false });
      await result.current.store?.set?.('autoRun', { enabled: true });

      // Replaying the stale {enabled: false} would undo the user's later choice.
      expect(getPendingWriteQueue()).toEqual([
        { key: 'autoRun', value: { enabled: true } },
      ]);

      consoleSpy.mockRestore();
    });
  });

  describe('store.delete routing', () => {
    const setupProvider = () => {
      const mockApi = buildMockElectronApi();
      mockApi.store.delete.mockResolvedValue(undefined);
      (window as unknown as Record<string, unknown>).electronAPI = mockApi;

      const { result } = renderHook(() => useContext(ElectronApiContext), {
        wrapper: ({ children }: PropsWithChildren) =>
          createElement(ElectronApiProvider, null, children),
      });
      return { result, mockApi };
    };

    it('routes Electron-native keys to IPC', async () => {
      const { result, mockApi } = setupProvider();

      await result.current.store?.delete?.('knownVersion');

      expect(mockApi.store.delete).toHaveBeenCalledWith('knownVersion');
      expect(mockEmitPearlStoreDelete).not.toHaveBeenCalled();
    });

    it('routes backend-bound keys to StoreService and event bus', async () => {
      const { result, mockApi } = setupProvider();

      await result.current.store?.delete?.('lastSelectedServiceConfigId');

      expect(mockApi.store.delete).not.toHaveBeenCalled();
      expect(mockEmitPearlStoreDelete).toHaveBeenCalledWith(
        'lastSelectedServiceConfigId',
      );
      expect(mockDeleteStoreKey).toHaveBeenCalledWith(
        'lastSelectedServiceConfigId',
      );
    });

    it('logs error when backend delete fails', async () => {
      const { result } = setupProvider();
      const deleteError = new Error('network error');
      mockDeleteStoreKey.mockRejectedValueOnce(deleteError);

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await result.current.store?.delete?.('autoRun');

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to delete store key 'autoRun':",
        deleteError,
      );

      consoleSpy.mockRestore();
    });

    it('drops a queued write once the key is deleted successfully', async () => {
      resetPendingStoreWrites();
      const { result, mockApi } = setupProvider();
      mockApi.store.set.mockResolvedValue(undefined);

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockSetStoreKey.mockRejectedValueOnce(new Error('Failed to fetch'));
      await result.current.store?.set?.('autoRun', { enabled: false });

      mockDeleteStoreKey.mockResolvedValueOnce(undefined);
      await result.current.store?.delete?.('autoRun');

      // Replaying the queued write would resurrect the deleted key.
      expect(getPendingWriteQueue()).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('discards a late rejection for a key deleted in the meantime', async () => {
      resetPendingStoreWrites();
      const { result } = setupProvider();

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      let rejectWrite!: (error: Error) => void;
      mockSetStoreKey.mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectWrite = reject;
        }),
      );
      const write = result.current.store?.set?.('autoRun', { enabled: false });

      mockDeleteStoreKey.mockResolvedValueOnce(undefined);
      await result.current.store?.delete?.('autoRun');

      rejectWrite(new TypeError('Failed to fetch'));
      await write;

      // Replaying the write would resurrect the key the user deleted.
      expect(getPendingWriteQueue()).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe('store.clear', () => {
    it('clears both Electron-native and backend-bound keys', async () => {
      const mockApi = buildMockElectronApi();
      mockApi.store.clear.mockResolvedValue(undefined);
      (window as unknown as Record<string, unknown>).electronAPI = mockApi;

      mockDeleteStoreKey.mockResolvedValue(undefined);

      const { result } = renderHook(() => useContext(ElectronApiContext), {
        wrapper: ({ children }: PropsWithChildren) =>
          createElement(ElectronApiProvider, null, children),
      });

      await result.current.store?.clear?.();

      // Electron-native keys cleared via IPC
      expect(mockApi.store.clear).toHaveBeenCalled();

      // Backend-bound keys deleted individually
      expect(mockDeleteStoreKey).toHaveBeenCalled();
      expect(mockEmitPearlStoreDelete).toHaveBeenCalled();

      // Verify at least some known backend-bound keys are deleted
      const deletedKeys = mockDeleteStoreKey.mock.calls.map(
        (call: unknown[]) => call[0],
      );
      expect(deletedKeys).toContain('trader');
      expect(deletedKeys).toContain('autoRun');
      expect(deletedKeys).toContain('lastSelectedServiceConfigId');
    });

    it('drops queued writes so a later failure cannot resurrect reset data', async () => {
      resetPendingStoreWrites();
      const mockApi = buildMockElectronApi();
      mockApi.store.clear.mockResolvedValue(undefined);
      mockApi.store.set.mockResolvedValue(undefined);
      (window as unknown as Record<string, unknown>).electronAPI = mockApi;

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const { result } = renderHook(() => useContext(ElectronApiContext), {
        wrapper: ({ children }: PropsWithChildren) =>
          createElement(ElectronApiProvider, null, children),
      });

      // A write fails and is queued, then the user resets their account.
      mockSetStoreKey.mockRejectedValueOnce(new Error('Failed to fetch'));
      await result.current.store?.set?.('autoRun', { enabled: true });
      expect(getPendingWriteQueue()).toHaveLength(1);

      mockDeleteStoreKey.mockResolvedValue(undefined);
      await result.current.store?.clear?.();
      expect(getPendingWriteQueue()).toEqual([]);

      // A failure after the reset must not re-persist the pre-clear entry.
      mockSetStoreKey.mockRejectedValueOnce(new Error('Failed to fetch'));
      await result.current.store?.set?.('lastSelectedServiceConfigId', 'svc-1');

      const pendingCalls = mockApi.store.set.mock.calls.filter(
        (call: unknown[]) => call[0] === 'pendingStoreWrites',
      );
      expect(pendingCalls[pendingCalls.length - 1][1]).toEqual([
        { key: 'lastSelectedServiceConfigId', value: 'svc-1' },
      ]);

      consoleSpy.mockRestore();
    });
  });
});
