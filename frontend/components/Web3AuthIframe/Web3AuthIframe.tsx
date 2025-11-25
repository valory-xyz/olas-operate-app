import { Spin } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

import { WEB3AUTH_LOGIN_URL } from '@/constants';
import { useElectronApi } from '@/hooks/useElectronApi';
import { Address } from '@/types/Address';

import { LoadingSpinner } from '../ui';
import { Iframe, IframeContainer, SpinnerOverlay } from './styles';

type AuthSuccessEventData = {
  event_id: 'WEB3AUTH_AUTH_SUCCESS';
  address: Address;
};

type ModalInitializedData = {
  event_id: 'WEB3AUTH_MODAL_INITIALIZED';
};

type ModalClosedData = {
  event_id: 'WEB3AUTH_MODAL_CLOSED';
};

type Web3AuthEvent = {
  event: string;
  data: ModalInitializedData | AuthSuccessEventData | ModalClosedData;
};

export const Web3AuthIframe = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { web3AuthWindow, logEvent } = useElectronApi();

  const ref = useRef<HTMLIFrameElement>(null);

  const handleEventListener = useCallback(
    (event: MessageEvent) => {
      const web3authIframe = ref.current?.contentWindow;
      if (event.source !== web3authIframe) return;

      const eventDetails = event as unknown as Web3AuthEvent;
      if (!eventDetails.data) return;
      if (!eventDetails.data.event_id) return;

      // To get all the events and log them
      logEvent?.(
        `Web3auth event: ${JSON.stringify(eventDetails.data.event_id)}`,
      );

      // Handle modal initialize
      if (eventDetails.data.event_id === 'WEB3AUTH_MODAL_INITIALIZED') {
        setIsLoading(false);
      }

      // Handle modal close
      if (eventDetails.data.event_id === 'WEB3AUTH_MODAL_CLOSED') {
        web3AuthWindow?.close?.();
      }

      // Handle success auth
      if (eventDetails.data.event_id === 'WEB3AUTH_AUTH_SUCCESS') {
        const backupWallet = eventDetails.data.address;
        if (!backupWallet) return;
        web3AuthWindow?.authSuccess?.(backupWallet);
      }
    },
    [logEvent, web3AuthWindow],
  );

  useEffect(() => {
    window.addEventListener('message', handleEventListener);
    return () => window.removeEventListener('message', handleEventListener);
  }, [logEvent, web3AuthWindow, handleEventListener]);

  return (
    <IframeContainer>
      <Iframe
        src={WEB3AUTH_LOGIN_URL}
        ref={ref}
        id="web3auth-iframe"
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="camera;microphone;payment"
      />
      {isLoading && (
        <SpinnerOverlay>
          <Spin size="large" indicator={<LoadingSpinner />} />
        </SpinnerOverlay>
      )}
    </IframeContainer>
  );
};
