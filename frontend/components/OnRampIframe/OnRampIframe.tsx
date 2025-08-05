import { Flex, Spin } from 'antd';
import { useEffect, useMemo } from 'react';

import { APP_HEIGHT, APP_WIDTH } from '@/constants/width';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { delayInSeconds } from '@/utils/delay';

import { KEY } from './constants';

const env: 'STAGING' | 'PRODUCTION' = 'STAGING';

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

  const apiKey = process.env.TRANSAK_API_KEY || KEY; // TODO: remove the fallback KEY

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const eventDetails = event as unknown as TransakEvent;
      if (!eventDetails.data) return;
      if (!eventDetails.data.event_id) return;

      // To get all the events and log them
      logEvent?.(`Transak event: ${JSON.stringify(eventDetails)}`);
      window.console.log('😀 Transak event:', eventDetails.data);

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

    const url = new URL(env === 'STAGING' ? STAGING_URL : PRODUCTION_URL);
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
  }, [masterEoa, networkName, cryptoCurrencyCode, usdAmountToPay, apiKey]);

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
          id="transak-iframe"
          style={{ width: '100%', height: '100%', border: 'none' }}
          src={onRampUrl}
          allow="camera;microphone;payment"
        />
      ) : (
        <Spin />
      )}
    </Flex>
  );
};
