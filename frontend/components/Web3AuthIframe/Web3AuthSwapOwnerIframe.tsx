import { Spin } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import { WEB3AUTH_SWAP_OWNER_URL } from '@/constants';
import { useElectronApi } from '@/hooks';
import {
  SwapOwnerParams,
  SwapOwnerTransactionFailure,
  SwapOwnerTransactionSuccess,
} from '@/types/Recovery';

import { LoadingSpinner } from '../ui';
import { Iframe, IframeContainer, SpinnerOverlay } from './styles';

type Web3AuthSwapOwnerIframeProps = SwapOwnerParams;

enum Events {
  WEB3AUTH_SWAP_OWNER_MODAL_INITIALIZED = 'WEB3AUTH_SWAP_OWNER_MODAL_INITIALIZED',
  WEB3AUTH_SWAP_OWNER_SUCCESS = 'WEB3AUTH_SWAP_OWNER_SUCCESS',
  WEB3AUTH_SWAP_OWNER_FAILURE = 'WEB3AUTH_SWAP_OWNER_FAILURE',
  WEB3AUTH_SWAP_OWNER_MODAL_CLOSED = 'WEB3AUTH_SWAP_OWNER_MODAL_CLOSED',
}

type Web3AuthSwapOwnerModalInitialized = {
  event_id: Events.WEB3AUTH_SWAP_OWNER_MODAL_INITIALIZED;
};

type Web3AuthSwapOwnerSuccess = {
  event_id: Events.WEB3AUTH_SWAP_OWNER_SUCCESS;
} & SwapOwnerTransactionSuccess;

type Web3AuthSwapOwnerFailure = {
  event_id: Events.WEB3AUTH_SWAP_OWNER_FAILURE;
} & SwapOwnerTransactionFailure;

type Web3AuthSwapOwnerModalClosed = {
  event_id: Events.WEB3AUTH_SWAP_OWNER_MODAL_CLOSED;
};

type Web3AuthEvent = {
  event: string;
  data:
    | Web3AuthSwapOwnerModalInitialized
    | Web3AuthSwapOwnerSuccess
    | Web3AuthSwapOwnerFailure
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

  // Build query string using URLSearchParams for proper encoding & readability.
  const iframeUrl = useMemo(() => {
    const params = new URLSearchParams();
    const entries: Array<[string, string | number | undefined]> = [
      ['safeAddress', safeAddress],
      ['oldOwnerAddress', oldOwnerAddress],
      ['newOwnerAddress', newOwnerAddress],
      ['backupOwnerAddress', backupOwnerAddress],
      ['chainId', chainId],
    ];
    entries.forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    return `${WEB3AUTH_SWAP_OWNER_URL}?${params.toString()}`;
  }, [
    safeAddress,
    oldOwnerAddress,
    newOwnerAddress,
    backupOwnerAddress,
    chainId,
  ]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const web3authSwapOwnerIframe = ref.current?.contentWindow;
      if (event.source !== web3authSwapOwnerIframe) return;

      const eventDetails = event as unknown as Web3AuthEvent;
      if (!eventDetails.data) return;
      if (!eventDetails.data.event_id) return;

      // To get all the events and log them
      logEvent?.(
        `Web3auth event from iframe: ${JSON.stringify(eventDetails.data.event_id)}`,
      );

      if (
        eventDetails.data.event_id ===
        Events.WEB3AUTH_SWAP_OWNER_MODAL_INITIALIZED
      ) {
        setIsLoading(false);
      }

      if (
        eventDetails.data.event_id === Events.WEB3AUTH_SWAP_OWNER_MODAL_CLOSED
      ) {
        web3AuthSwapOwnerWindow?.close?.();
      }

      if (eventDetails.data.event_id === Events.WEB3AUTH_SWAP_OWNER_SUCCESS) {
        const result = eventDetails.data;
        if (!result) return;
        web3AuthSwapOwnerWindow?.swapSuccess?.(result);
      }

      if (eventDetails.data.event_id === Events.WEB3AUTH_SWAP_OWNER_FAILURE) {
        const result = eventDetails.data;
        if (!result) return;
        web3AuthSwapOwnerWindow?.swapFailure?.(result);
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
