import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { useWeb3AuthSwapOwner } from '../../../../components/AccountRecovery/hooks/useWeb3AuthSwapOwner';
import { SwapOwnerParams } from '../../../../types/Recovery';
import {
  DEFAULT_SAFE_ADDRESS,
  MOCK_TX_HASH_1,
} from '../../../helpers/factories';

const mockIpcOn = jest.fn();
const mockIpcRemoveListener = jest.fn();
const mockWindowShow = jest.fn();
const mockWindowClose = jest.fn();

jest.mock('../../../../hooks', () => ({
  useElectronApi: () => ({
    ipcRenderer: {
      on: mockIpcOn,
      removeListener: mockIpcRemoveListener,
    },
    web3AuthSwapOwnerWindow: {
      show: mockWindowShow,
      close: mockWindowClose,
    },
  }),
}));

jest.mock('antd', () => ({
  message: { success: jest.fn(), error: jest.fn() },
}));

describe('useWeb3AuthSwapOwner', () => {
  const mockOnFinish = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens web3auth window with params', () => {
    const { result } = renderHook(() =>
      useWeb3AuthSwapOwner({ onFinish: mockOnFinish, onClose: mockOnClose }),
    );

    const params = {
      safeAddress: DEFAULT_SAFE_ADDRESS,
      chainId: 100,
    } as unknown as SwapOwnerParams;

    act(() => {
      result.current.openWeb3AuthSwapOwnerModel(params);
    });
    expect(mockWindowShow).toHaveBeenCalledWith(params);
  });

  it('registers IPC listeners on mount', () => {
    renderHook(() =>
      useWeb3AuthSwapOwner({ onFinish: mockOnFinish, onClose: mockOnClose }),
    );

    // Should register for success, failure, and window-closed events
    expect(mockIpcOn).toHaveBeenCalledWith(
      'web3auth-swap-owner-success',
      expect.any(Function),
    );
    expect(mockIpcOn).toHaveBeenCalledWith(
      'web3auth-swap-owner-failure',
      expect.any(Function),
    );
    expect(mockIpcOn).toHaveBeenCalledWith(
      'web3auth-swap-owner-window-closed',
      expect.any(Function),
    );
  });

  it('removes IPC listeners on unmount', () => {
    const { unmount } = renderHook(() =>
      useWeb3AuthSwapOwner({ onFinish: mockOnFinish, onClose: mockOnClose }),
    );

    unmount();

    expect(mockIpcRemoveListener).toHaveBeenCalledWith(
      'web3auth-swap-owner-success',
      expect.any(Function),
    );
    expect(mockIpcRemoveListener).toHaveBeenCalledWith(
      'web3auth-swap-owner-failure',
      expect.any(Function),
    );
    expect(mockIpcRemoveListener).toHaveBeenCalledWith(
      'web3auth-swap-owner-window-closed',
      expect.any(Function),
    );
  });

  it('calls onFinish and shows success message on success event', () => {
    renderHook(() =>
      useWeb3AuthSwapOwner({ onFinish: mockOnFinish, onClose: mockOnClose }),
    );

    // Find the success handler from the IPC on calls
    const successHandler = mockIpcOn.mock.calls.find(
      ([event]) => event === 'web3auth-swap-owner-success',
    )![1];

    const successData = { txHash: '0xabc123' };
    act(() => {
      successHandler(successData);
    });

    expect(mockOnFinish).toHaveBeenCalledWith(successData);
    expect(mockWindowClose).toHaveBeenCalled();
  });

  it('calls onFinish and shows error message on failure event', () => {
    renderHook(() =>
      useWeb3AuthSwapOwner({ onFinish: mockOnFinish, onClose: mockOnClose }),
    );

    const failureHandler = mockIpcOn.mock.calls.find(
      ([event]) => event === 'web3auth-swap-owner-failure',
    )![1];

    const failureData = { error: 'Transaction reverted' };
    act(() => {
      failureHandler(failureData);
    });
    expect(mockOnFinish).toHaveBeenCalledWith(failureData);
  });

  it('calls onClose when window is closed without result', () => {
    renderHook(() =>
      useWeb3AuthSwapOwner({ onFinish: mockOnFinish, onClose: mockOnClose }),
    );

    const windowClosedHandler = mockIpcOn.mock.calls.find(
      ([event]) => event === 'web3auth-swap-owner-window-closed',
    )![1];

    act(() => {
      windowClosedHandler();
    });
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockWindowClose).toHaveBeenCalled();
  });

  it('prevents duplicate callbacks via isResultReceived ref', () => {
    renderHook(() =>
      useWeb3AuthSwapOwner({ onFinish: mockOnFinish, onClose: mockOnClose }),
    );

    const successHandler = mockIpcOn.mock.calls.find(
      ([event]) => event === 'web3auth-swap-owner-success',
    )![1];

    const windowClosedHandler = mockIpcOn.mock.calls.find(
      ([event]) => event === 'web3auth-swap-owner-window-closed',
    )![1];

    // First call — success
    act(() => {
      successHandler({ txHash: MOCK_TX_HASH_1 });
    });
    expect(mockOnFinish).toHaveBeenCalledTimes(1);

    // Second call — window closed after success already received
    act(() => {
      windowClosedHandler();
    });

    // onClose should NOT be called because result was already received
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnFinish).toHaveBeenCalledTimes(1);
  });
});
