import { Flex, Spin } from 'antd';
import { useEffect, useMemo, useRef } from 'react';

import { isDev } from '@/constants/env';
import { APP_HEIGHT, APP_WIDTH } from '@/constants/width';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { delayInSeconds } from '@/utils/delay';

import { apiKey } from '../OnRampWidget/OnRampWidget';

const STAGING_URL = `https://global-stg.transak.com/`;
const PRODUCTION_URL = `https://global.transak.com/`;

type TransakEvent = {
  event: string;
  data: {
    event_id:
      | 'TRANSAK_WIDGET_CLOSE'
      | 'TRANSAK_WIDGET_INITIALISED'
      | 'TRANSAK_ORDER_SUCCESSFUL'
      | 'TRANSAK_ORDER_FAILED';
    data: unknown;
  };
};

type OnRampIframeProps = { usdAmountToPay: number };

export const OnRampIframe = ({ usdAmountToPay }: OnRampIframeProps) => {
  const { onRampWindow, logEvent } = useElectronApi();
  const { networkName, cryptoCurrencyCode } = useOnRampContext();
  const { masterEoa } = useMasterWalletContext();

  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const transakIframe = ref.current?.contentWindow;

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== transakIframe) return;

      const eventDetails = event as unknown as TransakEvent;
      if (!eventDetails.data) return;
      if (!eventDetails.data.event_id) return;

      // To get all the events and log them
      logEvent?.(`Transak event: ${JSON.stringify(eventDetails)}`);

      if (eventDetails.data.event_id === 'TRANSAK_WIDGET_CLOSE') {
        onRampWindow?.hide?.();
      }

      // This will trigger when the user marks payment is made.
      // User can close/navigate away at this event.
      if (eventDetails.data.event_id === 'TRANSAK_ORDER_SUCCESSFUL') {
        delayInSeconds(3).then(() => {
          onRampWindow?.transactionSuccess?.();
        });
      }

      if (eventDetails.data.event_id === 'TRANSAK_ORDER_FAILED') {
        delayInSeconds(3).then(() => {
          onRampWindow?.transactionFailure?.();
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [logEvent, onRampWindow]);

  const onRampUrl = useMemo(() => {
    if (!masterEoa?.address) return;
    if (!networkName || !cryptoCurrencyCode) return;

    if (!apiKey) {
      console.error('TRANSAK_API_KEY is not set');
      return;
    }

    const url = new URL(isDev ? STAGING_URL : PRODUCTION_URL);
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('productsAvailed', 'BUY');
    url.searchParams.set('paymentMethod', 'credit_debit_card');
    url.searchParams.set('network', networkName);
    url.searchParams.set('cryptoCurrencyCode', cryptoCurrencyCode);
    url.searchParams.set('fiatCurrency', 'USD');
    url.searchParams.set('fiatAmount', String(usdAmountToPay));
    url.searchParams.set('walletAddress', masterEoa.address);
    url.searchParams.set('hideMenu', 'true');

    return url.toString();
  }, [masterEoa, networkName, cryptoCurrencyCode, usdAmountToPay]);

  return (
    <Flex
      justify="center"
      align="center"
      vertical
      style={{
        overflow: 'hidden',
        height: `calc(${APP_HEIGHT}px - 45px)`,
        width: APP_WIDTH,
      }}
    >
      {onRampUrl ? (
        <iframe
          src={onRampUrl}
          ref={ref}
          id="transak-iframe"
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="camera;microphone;payment"
        />
      ) : (
        <Spin />
      )}
    </Flex>
  );
};
