import { message } from 'antd';
import { useEffect, useRef } from 'react';

import { useElectronApi } from '@/hooks';
import { SwapOwnerTransactionResult } from '@/types/Recovery';

export const useWeb3AuthSwapOwner = ({
  onFinish,
}: {
  onFinish: (result: SwapOwnerTransactionResult) => void;
}) => {
  const { ipcRenderer, web3AuthSwapOwnerWindow } = useElectronApi();

  const isResultReceived = useRef(false);

  const openWeb3AuthSwapOwnerModel = () => {
    if (!web3AuthSwapOwnerWindow?.show) return;
    web3AuthSwapOwnerWindow?.show();
  };

  useEffect(() => {
    const handleSaveWeb3AuthAddress = (data: unknown) => {
      if (isResultReceived.current) return;

      const result = data as SwapOwnerTransactionResult;
      if (!result) return;

      isResultReceived.current = true;
      // web3AuthSwapOwnerWindow?.close?.();
      onFinish(result);
      message.success('Backup wallet successfully set');
    };

    ipcRenderer?.on?.('web3auth-swap-owner-result', handleSaveWeb3AuthAddress);
    return () => {
      ipcRenderer?.removeListener?.(
        'web3auth-swap-owner-result',
        handleSaveWeb3AuthAddress,
      );
    };
  });

  return { openWeb3AuthSwapOwnerModel };
};
