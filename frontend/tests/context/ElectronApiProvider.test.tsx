import { render, renderHook } from '@testing-library/react';
import { get, unset } from 'lodash';
import { createElement, PropsWithChildren, useContext } from 'react';

import {
  ElectronApiContext,
  ElectronApiProvider,
  getPendingWriteQueue,
  removeFlushedWrites,
  resetPendingWriteQueue,
  seedPendingWriteQueue,
} from '../../context/ElectronApiProvider';
import {
  emitPearlStoreDelete,
  emitPearlStoreSet,
} from '../../context/pearlStoreEventBus';
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
      resetPendingWriteQueue();
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
      resetPendingWriteQueue();
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
      resetPendingWriteQueue();
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
      resetPendingWriteQueue();
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

    it('keeps only the latest value when the same key fails twice', async () => {
      resetPendingWriteQueue();
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

    it('merges a new failure with the queue seeded from a previous session', async () => {
      resetPendingWriteQueue();
      seedPendingWriteQueue([{ key: 'autoRun', value: { enabled: false } }]);
      const { result, mockApi } = setupProvider();
      mockApi.store.set.mockResolvedValue(undefined);
      mockSetStoreKey.mockRejectedValue(new Error('Failed to fetch'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await result.current.store?.set?.('lastSelectedServiceConfigId', 'svc-2');

      // The seeded entry must survive — persisting only the new write would
      // silently drop the previous session's queue.
      const pendingCalls = mockApi.store.set.mock.calls.filter(
        (call: unknown[]) => call[0] === 'pendingStoreWrites',
      );
      expect(pendingCalls[0][1]).toEqual([
        { key: 'autoRun', value: { enabled: false } },
        { key: 'lastSelectedServiceConfigId', value: 'svc-2' },
      ]);

      consoleSpy.mockRestore();
    });
  });

  describe('pending write queue helpers', () => {
    it('removeFlushedWrites drops flushed entries and keeps newer ones', () => {
      resetPendingWriteQueue();
      const flushed = { key: 'autoRun', value: { enabled: false } };
      const stillPending = {
        key: 'lastSelectedServiceConfigId',
        value: 'svc-2',
      };
      seedPendingWriteQueue([flushed, stillPending]);

      expect(removeFlushedWrites([flushed])).toEqual([stillPending]);
      expect(getPendingWriteQueue()).toEqual([stillPending]);
    });

    it('removeFlushedWrites keeps a re-queued entry for an already flushed key', () => {
      resetPendingWriteQueue();
      const flushed = { key: 'autoRun', value: { enabled: false } };
      seedPendingWriteQueue([flushed]);

      // A fresh failure for the same key while the flush was in flight.
      const requeued = { key: 'autoRun', value: { enabled: true } };
      seedPendingWriteQueue([requeued]);

      expect(removeFlushedWrites([flushed])).toEqual([requeued]);
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
      resetPendingWriteQueue();
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
  });
});
