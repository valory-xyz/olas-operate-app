import { Maybe } from '@web3auth/modal';
import {
  useWeb3Auth,
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
} from '@web3auth/modal/react';
import { message } from 'antd';
import { useEffect, useRef } from 'react';

import { useSetup } from '@/hooks/useSetup';
import { Address } from '@/types/Address';

export const useWeb3AuthBackupWallet = ({
  onFinish,
}: {
  onFinish: () => void;
}) => {
  const { provider } = useWeb3Auth();
  const { connect, isConnected } = useWeb3AuthConnect();
  const { disconnect } = useWeb3AuthDisconnect();

  const { setBackupSigner } = useSetup();
  const isAddressUpdated = useRef(false);
  const isMessageShown = useRef(false);

  useEffect(() => {
    const getAccountAddressAndDisconnect = async () => {
      if (!provider) return;
      if (isAddressUpdated.current) return;

      try {
        const accounts: Maybe<Address[]> = await provider.request({
          method: 'eth_accounts',
        });

        if (!accounts || !accounts[0]) return;
        setBackupSigner({ address: accounts[0], type: 'web3auth' });
        isAddressUpdated.current = true;
        disconnect();
        onFinish();

        if (!isMessageShown.current) {
          message.success('Backup wallet successfully set');
          isMessageShown.current = true;
        }
      } catch (error) {
        console.error('Error getting address:', error);
      }
    };

    if (isConnected) {
      getAccountAddressAndDisconnect();
    }
  }, [disconnect, isConnected, provider, setBackupSigner, onFinish]);

  return { connect };
};
