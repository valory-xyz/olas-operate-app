import { Flex, Spin } from 'antd';
import { useEffect, useMemo, useRef } from 'react';

import { APP_HEIGHT, APP_WIDTH, ON_RAMP_GATEWAY_URL } from '@/constants';
import { useElectronApi, useMasterWalletContext } from '@/hooks';
import { delayInSeconds } from '@/utils/delay';

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

type OnRampIframeProps = {
  usdAmountToPay: number;
  networkName?: string;
  cryptoCurrencyCode?: string;
};

export const OnRampIframe = ({
  usdAmountToPay,
  networkName,
  cryptoCurrencyCode,
}: OnRampIframeProps) => {
  const { onRampWindow, logEvent } = useElectronApi();
  const { masterEoa } = useMasterWalletContext();

  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const transakIframe = ref.current?.contentWindow;
      if (event.source !== transakIframe) return;

      const eventDetails = event as unknown as TransakEvent;
      if (!eventDetails.data) return;
      if (!eventDetails.data.event_id) return;

      // To get all the events and log them
      logEvent?.(
        `Transak event: ${JSON.stringify(eventDetails.data.event_id)}`,
      );

      if (eventDetails.data.event_id === 'TRANSAK_WIDGET_CLOSE') {
        onRampWindow?.close?.();
      }

      // Close the on-ramp window if the transaction fails
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

    const url = new URL(ON_RAMP_GATEWAY_URL);
    url.searchParams.set('productsAvailed', 'BUY');
    url.searchParams.set('paymentMethod', 'credit_debit_card');
    url.searchParams.set('network', networkName);
    url.searchParams.set('cryptoCurrencyCode', cryptoCurrencyCode);
    url.searchParams.set('fiatCurrency', 'USD');
    url.searchParams.set('fiatAmount', String(usdAmountToPay));
    // Note: "from" address should always be mEOA for bridging
    // so we should on-ramp to mEOA only
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
