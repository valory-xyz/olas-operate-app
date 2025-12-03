import { message } from 'antd';
import { useCallback, useEffect, useRef } from 'react';

import { useElectronApi } from '@/hooks';
import {
  SwapOwnerParams,
  SwapOwnerTransactionFailure,
  SwapOwnerTransactionSuccess,
} from '@/types/Recovery';

const WEB3AUTH = {
  SUCCESS: 'web3auth-swap-owner-success',
  FAILURE: 'web3auth-swap-owner-failure',
  WINDOW_CLOSED: 'web3auth-swap-owner-window-closed',
};

type UseWeb3AuthSwapOwner = {
  onFinish: (
    result: SwapOwnerTransactionSuccess | SwapOwnerTransactionFailure,
  ) => void;
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
    const handleWeb3AuthSwapOwnerSuccess = (data: unknown) => {
      if (isResultReceived.current) return;

      const result = data as SwapOwnerTransactionSuccess;
      if (!result) return;

      isResultReceived.current = true;
      onFinish(result);
      web3AuthSwapOwnerWindow?.close?.();
      message.success('Transaction completed successfully');
    };

    const handleWeb3AuthSwapOwnerFailure = (data: unknown) => {
      if (isResultReceived.current) return;

      const result = data as SwapOwnerTransactionFailure;
      if (!result) return;

      isResultReceived.current = true;
      onFinish(result);
      message.error('Transaction failed');
    };

    ipcRenderer?.on?.(WEB3AUTH.SUCCESS, handleWeb3AuthSwapOwnerSuccess);
    ipcRenderer?.on?.(WEB3AUTH.FAILURE, handleWeb3AuthSwapOwnerFailure);
    return () => {
      ipcRenderer?.removeListener?.(
        WEB3AUTH.SUCCESS,
        handleWeb3AuthSwapOwnerSuccess,
      );
      ipcRenderer?.removeListener?.(
        WEB3AUTH.FAILURE,
        handleWeb3AuthSwapOwnerFailure,
      );
    };
  }, [ipcRenderer, onFinish, web3AuthSwapOwnerWindow]);

  // Listen for window closed event
  useEffect(() => {
    const handleWindowClosed = () => {
      if (isResultReceived.current) return;

      isResultReceived.current = true;
      web3AuthSwapOwnerWindow?.close?.();
      onClose();
    };

    ipcRenderer?.on?.(WEB3AUTH.WINDOW_CLOSED, handleWindowClosed);
    return () => {
      ipcRenderer?.removeListener?.(WEB3AUTH.WINDOW_CLOSED, handleWindowClosed);
    };
  }, [ipcRenderer, onClose, web3AuthSwapOwnerWindow]);

  return { openWeb3AuthSwapOwnerModel };
};
