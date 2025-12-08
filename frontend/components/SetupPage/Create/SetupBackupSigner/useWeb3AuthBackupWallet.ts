import { message } from 'antd';
import { useEffect, useRef } from 'react';

import { useElectronApi, useSetup } from '@/hooks';
import { Address } from '@/types/Address';

export const useWeb3AuthBackupWallet = ({
  onFinish,
}: {
  onFinish: (backupWallet: Address) => void;
}) => {
  const { ipcRenderer, web3AuthWindow } = useElectronApi();
  const { setBackupSigner } = useSetup();

  const isAddressReceived = useRef(false);

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
      onFinish(backupWallet);
      message.success('Backup wallet successfully set');
    };

    ipcRenderer?.on?.('web3auth-address-received', handleSaveWeb3AuthAddress);
    return () => {
      ipcRenderer?.removeListener?.(
        'web3auth-address-received',
        handleSaveWeb3AuthAddress,
      );
    };
  });

  return { openWeb3AuthModel };
};
