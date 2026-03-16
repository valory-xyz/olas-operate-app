import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { useWeb3AuthBackupWallet } from '../../../../../components/SetupPage/Create/SetupBackupSigner/useWeb3AuthBackupWallet';
import { BACKUP_SIGNER_ADDRESS } from '../../../../helpers/factories';

const mockShow = jest.fn();
const mockClose = jest.fn();
const mockOn = jest.fn();
const mockRemoveListener = jest.fn();
const mockSetBackupSigner = jest.fn();
const mockMessageSuccess = jest.fn();

jest.mock('antd', () => ({
  message: { success: (...args: unknown[]) => mockMessageSuccess(...args) },
}));

jest.mock('../../../../../hooks', () => ({
  useSetup: jest.fn(() => ({ setBackupSigner: mockSetBackupSigner })),
  useElectronApi: jest.fn(() => ({
    ipcRenderer: { on: mockOn, removeListener: mockRemoveListener },
    web3AuthWindow: { show: mockShow, close: mockClose },
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useElectronApi } = require('../../../../../hooks') as {
  useElectronApi: jest.Mock;
};

describe('useWeb3AuthBackupWallet', () => {
  const onFinish = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useElectronApi.mockReturnValue({
      ipcRenderer: { on: mockOn, removeListener: mockRemoveListener },
      web3AuthWindow: { show: mockShow, close: mockClose },
    });
  });

  it('returns openWeb3AuthModel function', () => {
    const { result } = renderHook(() => useWeb3AuthBackupWallet({ onFinish }));
    expect(result.current.openWeb3AuthModel).toBeInstanceOf(Function);
  });

  it('openWeb3AuthModel calls web3AuthWindow.show', () => {
    const { result } = renderHook(() => useWeb3AuthBackupWallet({ onFinish }));
    act(() => {
      result.current.openWeb3AuthModel();
    });
    expect(mockShow).toHaveBeenCalledTimes(1);
  });

  it('does nothing when web3AuthWindow.show is undefined', () => {
    useElectronApi.mockReturnValue({
      ipcRenderer: { on: mockOn, removeListener: mockRemoveListener },
      web3AuthWindow: {},
    });
    const { result } = renderHook(() => useWeb3AuthBackupWallet({ onFinish }));
    act(() => {
      result.current.openWeb3AuthModel();
    });
    expect(mockShow).not.toHaveBeenCalled();
  });

  it('registers IPC listener for web3auth-address-received', () => {
    renderHook(() => useWeb3AuthBackupWallet({ onFinish }));
    expect(mockOn).toHaveBeenCalledWith(
      'web3auth-address-received',
      expect.any(Function),
    );
  });

  it('calls setBackupSigner and onFinish when address is received', () => {
    renderHook(() => useWeb3AuthBackupWallet({ onFinish }));
    const handler = mockOn.mock.calls[0][1];
    act(() => {
      handler(BACKUP_SIGNER_ADDRESS);
    });
    expect(mockSetBackupSigner).toHaveBeenCalledWith({
      address: BACKUP_SIGNER_ADDRESS,
      type: 'web3auth',
    });
    expect(onFinish).toHaveBeenCalledWith(BACKUP_SIGNER_ADDRESS);
  });

  it('shows success message on address received', () => {
    renderHook(() => useWeb3AuthBackupWallet({ onFinish }));
    const handler = mockOn.mock.calls[0][1];
    act(() => {
      handler(BACKUP_SIGNER_ADDRESS);
    });
    expect(mockMessageSuccess).toHaveBeenCalledWith(
      'Backup wallet successfully set',
    );
  });

  it('closes web3AuthWindow when address is received', () => {
    renderHook(() => useWeb3AuthBackupWallet({ onFinish }));
    const handler = mockOn.mock.calls[0][1];
    act(() => {
      handler(BACKUP_SIGNER_ADDRESS);
    });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate addresses (isAddressReceived ref)', () => {
    renderHook(() => useWeb3AuthBackupWallet({ onFinish }));
    const handler = mockOn.mock.calls[0][1];
    act(() => {
      handler(BACKUP_SIGNER_ADDRESS);
    });
    act(() => {
      handler(BACKUP_SIGNER_ADDRESS);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(mockSetBackupSigner).toHaveBeenCalledTimes(1);
  });

  it('ignores falsy address', () => {
    renderHook(() => useWeb3AuthBackupWallet({ onFinish }));
    const handler = mockOn.mock.calls[0][1];
    act(() => {
      handler('');
    });
    expect(onFinish).not.toHaveBeenCalled();
    expect(mockSetBackupSigner).not.toHaveBeenCalled();
  });

  it('ignores null address', () => {
    renderHook(() => useWeb3AuthBackupWallet({ onFinish }));
    const handler = mockOn.mock.calls[0][1];
    act(() => {
      handler(null);
    });
    expect(onFinish).not.toHaveBeenCalled();
    expect(mockSetBackupSigner).not.toHaveBeenCalled();
  });

  it('cleans up listener on unmount', () => {
    // NOTE: The hook correctly passes the same handler reference to both
    // ipcRenderer.on and ipcRenderer.removeListener. However, the real
    // Electron preload (electron/preload.js) wraps the handler in .on()
    // with `(event, ...args) => func(...args)`, so removeListener with the
    // original func is effectively a no-op in production. This is a known
    // preload-layer issue, not a hook bug.
    const { unmount } = renderHook(() => useWeb3AuthBackupWallet({ onFinish }));
    const registeredHandler = mockOn.mock.calls[0][1];
    unmount();
    expect(mockRemoveListener).toHaveBeenCalledWith(
      'web3auth-address-received',
      registeredHandler,
    );
  });
});
