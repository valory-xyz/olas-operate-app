import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import {
  ElectronApiContext,
  ElectronApiProvider,
} from '../../context/ElectronApiProvider';

const useElectronApiContext = () => React.useContext(ElectronApiContext);

describe('ElectronApiProvider', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Suppress React error boundary noise in test output
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).electronAPI;
  });

  it('throws when a function is not found on window.electronAPI', () => {
    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(ElectronApiProvider, null, children);

    expect(() =>
      renderHook(() => useElectronApiContext(), { wrapper }),
    ).toThrow('not found in window.electronAPI');
  });

  it('provides functions from window.electronAPI when available', () => {
    const mockCloseApp = jest.fn();
    const mockMinimizeApp = jest.fn();
    const mockGetAppVersion = jest.fn().mockResolvedValue('1.4.4');
    const mockLogEvent = jest.fn();
    const mockNextLogError = jest.fn();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).electronAPI = {
      getAppVersion: mockGetAppVersion,
      setIsAppLoaded: jest.fn(),
      closeApp: mockCloseApp,
      minimizeApp: mockMinimizeApp,
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
      logEvent: mockLogEvent,
      nextLogError: mockNextLogError,
    };

    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(ElectronApiProvider, null, children);

    const { result } = renderHook(() => useElectronApiContext(), { wrapper });

    expect(result.current.closeApp).toBe(mockCloseApp);
    expect(result.current.minimizeApp).toBe(mockMinimizeApp);
    expect(result.current.getAppVersion).toBe(mockGetAppVersion);
    expect(result.current.logEvent).toBe(mockLogEvent);
    expect(result.current.nextLogError).toBe(mockNextLogError);
  });
});
