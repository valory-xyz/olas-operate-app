import { message } from 'antd';
import { useEffect, useRef } from 'react';

import { useElectronApi, useSetup } from '@/hooks';
import { Address } from '@/types/Address';

type UseWeb3AuthBackupWalletOptions = {
  onFinish: (backupWallet: Address) => void;
  showSuccessMessage?: boolean;
};

export const useWeb3AuthBackupWallet = ({
  onFinish,
  showSuccessMessage = true,
}: UseWeb3AuthBackupWalletOptions) => {
  const { ipcRenderer, web3AuthWindow } = useElectronApi();
  const { setBackupSigner } = useSetup();

  const isAddressReceived = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const openWeb3AuthModel = () => {
    if (!web3AuthWindow?.show) return;
    web3AuthWindow?.show();
  };

  useEffect(() => {
    const handleSaveWeb3AuthAddress = (data: unknown) => {
      if (isAddressReceived.current) return;

      const backupWallet = data as Address;
      if (!backupWallet) return;

      isAddressReceived.current = true;
      web3AuthWindow?.close?.();
      setBackupSigner({ address: backupWallet, type: 'web3auth' });
      onFinishRef.current(backupWallet);
      if (showSuccessMessage) {
        message.success('Backup wallet successfully set');
      }
    };

    ipcRenderer?.on?.('web3auth-address-received', handleSaveWeb3AuthAddress);
    return () => {
      ipcRenderer?.removeListener?.(
        'web3auth-address-received',
        handleSaveWeb3AuthAddress,
      );
    };
  }, [ipcRenderer, web3AuthWindow, setBackupSigner, showSuccessMessage]);

  return { openWeb3AuthModel };
};
