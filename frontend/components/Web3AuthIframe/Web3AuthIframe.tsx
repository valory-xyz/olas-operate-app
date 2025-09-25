import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import { WEB3AUTH_GATEWAY_URL } from '@/constants/urls';
import { APP_HEIGHT, APP_WIDTH } from '@/constants/width';
import { useElectronApi } from '@/hooks/useElectronApi';
import { Address } from '@/types/Address';

import { LIGHT_ICON_STYLE } from '../ui/iconStyles';

type AUTH_SUCCESS_EVENT_DATA = {
  event_id: 'WEB3AUTH_AUTH_SUCCESS';
  address: Address;
};

type MODAL_INITIALIZED_DATA = {
  event_id: 'WEB3AUTH_MODAL_INITIALIZED';
};

type MODAL_CLOSED_DATA = {
  event_id: 'WEB3AUTH_MODAL_CLOSED';
};

type Web3AuthEvent = {
  event: string;
  data: MODAL_INITIALIZED_DATA | AUTH_SUCCESS_EVENT_DATA | MODAL_CLOSED_DATA;
};

const Container = styled.div`
  position: relative;
  width: ${APP_WIDTH}px;
  height: calc(${APP_HEIGHT}px - 45px);
  overflow: hidden;
`;

const Iframe = styled.iframe`
  position: absolute;
  width: 100%;
  height: 100%;
  border: none;
  z-index: 20;
`;

const SpinnerOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
`;

export const Web3AuthIframe = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { web3AuthWindow, logEvent } = useElectronApi();

  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const web3authIframe = ref.current?.contentWindow;

    const handleMessage = (event: MessageEvent) => {
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
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [logEvent, web3AuthWindow]);

  return (
    <Container>
      <Iframe
        src={WEB3AUTH_GATEWAY_URL}
        ref={ref}
        id="web3auth-iframe"
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="camera;microphone;payment"
      />
      {isLoading && (
        <SpinnerOverlay>
          <Spin
            size="large"
            indicator={<LoadingOutlined spin style={LIGHT_ICON_STYLE} />}
          />
        </SpinnerOverlay>
      )}
    </Container>
  );
};
