import { Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { WEB3AUTH_SWAP_OWNER_URL } from '@/constants';
import { useElectronApi } from '@/hooks';
import { SwapOwnerParams, SwapOwnerTransactionResult } from '@/types/Recovery';

import { LoadingSpinner } from '../ui';
import { Iframe, IframeContainer, SpinnerOverlay } from './styles';

type Web3AuthSwapOwnerIframeProps = SwapOwnerParams;

enum Events {
  WEB3AUTH_SWAP_OWNER_MODAL_INITIALIZED = 'WEB3AUTH_SWAP_OWNER_MODAL_INITIALIZED',
  WEB3AUTH_SWAP_OWNER_RESULT = 'WEB3AUTH_SWAP_OWNER_RESULT',
  WEB3AUTH_SWAP_OWNER_MODAL_CLOSED = 'WEB3AUTH_SWAP_OWNER_MODAL_CLOSED',
}

type Web3AuthSwapOwnerModalInitialized = {
  event_id: Events.WEB3AUTH_SWAP_OWNER_MODAL_INITIALIZED;
};

type Web3AuthSwapOwnerResult = {
  event_id: Events.WEB3AUTH_SWAP_OWNER_RESULT;
} & SwapOwnerTransactionResult;

type Web3AuthSwapOwnerModalClosed = {
  event_id: Events.WEB3AUTH_SWAP_OWNER_MODAL_CLOSED;
};

type Web3AuthEvent = {
  event: string;
  data:
    | Web3AuthSwapOwnerModalInitialized
    | Web3AuthSwapOwnerResult
    | Web3AuthSwapOwnerModalClosed;
};

export const Web3AuthSwapOwnerIframe = ({
  safeAddress,
  oldOwnerAddress,
  newOwnerAddress,
  backupOwnerAddress,
  chainId,
}: Web3AuthSwapOwnerIframeProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const { web3AuthSwapOwnerWindow, logEvent } = useElectronApi();

  const ref = useRef<HTMLIFrameElement>(null);

  const iframeUrl = `${WEB3AUTH_SWAP_OWNER_URL}?safeAddress=${safeAddress}&oldOwnerAddress=${oldOwnerAddress}&newOwnerAddress=${newOwnerAddress}&backupOwnerAddress=${backupOwnerAddress}&chainId=${chainId}`;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const web3authSwapOwnerIframe = ref.current?.contentWindow;
      if (event.source !== web3authSwapOwnerIframe) return;

      const eventDetails = event as unknown as Web3AuthEvent;
      if (!eventDetails.data) return;
      if (!eventDetails.data.event_id) return;

      console.log('IFRAME: Received web3auth event:', eventDetails.data);

      // To get all the events and log them
      logEvent?.(
        `Web3auth event from iframe: ${JSON.stringify(eventDetails.data.event_id)}`,
      );

      // Handle modal initialize
      if (
        eventDetails.data.event_id ===
        Events.WEB3AUTH_SWAP_OWNER_MODAL_INITIALIZED
      ) {
        setIsLoading(false);
      }

      // Handle modal close
      if (
        eventDetails.data.event_id === Events.WEB3AUTH_SWAP_OWNER_MODAL_CLOSED
      ) {
        console.log('IFRAME: CLOSE');
        web3AuthSwapOwnerWindow?.close?.();
      }

      // Handle success auth
      if (eventDetails.data.event_id === Events.WEB3AUTH_SWAP_OWNER_RESULT) {
        console.log(
          'IFRAME: Received web3auth-swap-owner-result:',
          eventDetails.data,
        );
        const result = eventDetails.data;
        if (!result) return;
        web3AuthSwapOwnerWindow?.swapResult?.(result);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [logEvent, web3AuthSwapOwnerWindow]);

  return (
    <IframeContainer>
      <Iframe
        src={iframeUrl}
        ref={ref}
        id="web3auth-swap-owner-iframe"
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
