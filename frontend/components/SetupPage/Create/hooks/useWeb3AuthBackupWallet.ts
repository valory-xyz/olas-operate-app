import { message } from 'antd';
import { useEffect, useRef } from 'react';

import { useElectronApi } from '@/hooks/useElectronApi';
import { useSetup } from '@/hooks/useSetup';
import { Address } from '@/types/Address';

type Web3AuthData = { address: Address };

export const useWeb3AuthBackupWallet = ({
  onFinish,
}: {
  onFinish: () => void;
}) => {
  const { ipcRenderer, web3AuthWindow } = useElectronApi();
  const { setBackupSigner } = useSetup();

  const isAddressReceived = useRef(false);

  const openWeb3AuthModel = () => {
    if (!web3AuthWindow?.show) return;
    web3AuthWindow?.show();
  };

  useEffect(() => {
    const handleSaveWeb3AuthAddress = (_event: unknown, data: unknown) => {
      if (isAddressReceived.current) return;
      const web3AuthData = data as Web3AuthData;
      if (web3AuthData.address) {
        isAddressReceived.current = true;
        setBackupSigner({ address: web3AuthData.address, type: 'web3auth' });
        onFinish();
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
  });

  return { openWeb3AuthModel };
};
