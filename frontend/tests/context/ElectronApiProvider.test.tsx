import { render, renderHook } from '@testing-library/react';
import { get, unset } from 'lodash';
import { createElement, PropsWithChildren, useContext } from 'react';

import {
  ElectronApiContext,
  ElectronApiProvider,
} from '../../context/ElectronApiProvider';

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

    for (const dotPath of ALL_FUNCTION_PATHS) {
      expect(get(result.current, dotPath)).toBe(get(mockApi, dotPath));
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

  it.each(ALL_FUNCTION_PATHS.map((p) => ({ dotPath: p })))(
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
});
