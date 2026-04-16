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
import { StoreService } from '../../service/StoreService';

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

const buildMockElectronApi = () => ({
  getAppVersion: jest.fn(),
  setIsAppLoaded: jest.fn(),
  closeApp: jest.fn(),
  minimizeApp: jest.fn(),
  setTrayIcon: jest.fn(),
  ipcRenderer: {
    send: jest.fn(),
    on: jest.fn(),
    invoke: jest.fn(),
    removeListener: jest.fn(),
  },
  store: {
    store: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  },
  showNotification: jest.fn(),
  saveLogs: jest.fn(),
  saveLogsForSupport: jest.fn(),
  cleanupSupportLogs: jest.fn(),
  readFile: jest.fn(),
  openPath: jest.fn(),
  onRampWindow: {
    show: jest.fn(),
    close: jest.fn(),
    transactionSuccess: jest.fn(),
    transactionFailure: jest.fn(),
  },
  web3AuthWindow: {
    show: jest.fn(),
    close: jest.fn(),
    authSuccess: jest.fn(),
  },
  web3AuthSwapOwnerWindow: {
    show: jest.fn(),
    close: jest.fn(),
    swapSuccess: jest.fn(),
    swapFailure: jest.fn(),
  },
  termsAndConditionsWindow: {
    show: jest.fn(),
  },
  logEvent: jest.fn(),
  nextLogError: jest.fn(),
});

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
