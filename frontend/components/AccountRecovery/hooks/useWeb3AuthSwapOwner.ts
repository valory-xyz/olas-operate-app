import { message } from 'antd';
import { useCallback, useEffect, useRef } from 'react';

import { useElectronApi } from '@/hooks';
import { SwapOwnerParams, SwapOwnerTransactionResult } from '@/types/Recovery';

// IPC channel map distinguishing request vs lifecycle events.
// RESULT: transaction completion payload from swap owner operation.
// WINDOW_CLOSED: canonical lifecycle broadcast after the window has been destroyed.
const WEB3AUTH = {
  RESULT: 'web3auth-swap-owner-result',
  WINDOW_CLOSED: 'web3auth-swap-owner-window-closed',
};

type UseWeb3AuthSwapOwner = {
  onFinish: (result: SwapOwnerTransactionResult) => void;
  onClose: () => void;
};

export const useWeb3AuthSwapOwner = ({
  onFinish,
  onClose,
}: UseWeb3AuthSwapOwner) => {
  const { ipcRenderer, web3AuthSwapOwnerWindow } = useElectronApi();

  const isResultReceived = useRef(false);

  const openWeb3AuthSwapOwnerModel = useCallback(
    (params: SwapOwnerParams) => {
      if (!web3AuthSwapOwnerWindow?.show) return;
      isResultReceived.current = false;
      web3AuthSwapOwnerWindow?.show(params);
    },
    [web3AuthSwapOwnerWindow],
  );

  // Listen for transaction result from web3auth swap owner window
  useEffect(() => {
    const handleWeb3AuthSwapOwnerResult = (data: unknown) => {
      if (isResultReceived.current) return;

      const result = data as SwapOwnerTransactionResult;
      if (!result) return;

      isResultReceived.current = true;
      onFinish(result);
      if (result.success) {
        web3AuthSwapOwnerWindow?.close?.();
        message.success('Transaction completed successfully');
      } else {
        // do not close the window on failure to see the error details.
        message.error('Transaction failed');
      }
    };

    ipcRenderer?.on?.(WEB3AUTH.RESULT, handleWeb3AuthSwapOwnerResult);
    return () => {
      ipcRenderer?.removeListener?.(
        WEB3AUTH.RESULT,
        handleWeb3AuthSwapOwnerResult,
      );
    };
  }, [ipcRenderer, onFinish, web3AuthSwapOwnerWindow]);

  // Listen for window closed event
  useEffect(() => {
    const handleWindowClosed = () => {
      console.log('web3auth-swap-owner-window-closed event received ?????? ');
      if (isResultReceived.current) return;

      isResultReceived.current = true;
      onClose();
    };

    ipcRenderer?.on?.(WEB3AUTH.WINDOW_CLOSED, handleWindowClosed);
    return () => {
      ipcRenderer?.removeListener?.(WEB3AUTH.WINDOW_CLOSED, handleWindowClosed);
      // no compatibility listener removal needed (dropped)
    };
  }, [ipcRenderer, onClose]);

  return { openWeb3AuthSwapOwnerModel };
};
