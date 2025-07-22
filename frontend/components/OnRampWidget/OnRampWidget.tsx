import { Transak } from '@transak/transak-sdk';
import { Flex, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { isDev } from '@/constants/env';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { delayInSeconds } from '@/utils/delay';

const { Title } = Typography;

type OnRampWidgetProps = {
  usdAmountToPay: number;
};

export const OnRampWidget = ({ usdAmountToPay }: OnRampWidgetProps) => {
  const { onRampWindow, logEvent } = useElectronApi();
  const { masterEoa } = useMasterWalletContext();

  const { networkName, cryptoCurrencyCode } = useOnRampContext();

  const [isWidgetLoading, setIsWidgetLoading] = useState(true);

  useEffect(() => {
    if (!masterEoa?.address) return;
    if (!networkName || !cryptoCurrencyCode) return;

    // Transak SDK requires a valid amount to proceed
    if (!usdAmountToPay) return;

    // Check if Transak API key is set
    if (!process.env.TRANSAK_API_KEY) {
      console.error('TRANSAK_API_KEY is not set');
      return;
    }

    /** https://docs.transak.com/docs/transak-sdk */
    const transak = new Transak({
      apiKey: process.env.TRANSAK_API_KEY,
      environment: isDev
        ? Transak.ENVIRONMENTS.STAGING
        : Transak.ENVIRONMENTS.PRODUCTION,
      widgetHeight: '700px',
      widgetWidth: '500px',
      /** default to BUY */
      productsAvailed: 'BUY',
      /** only credit_debit_card allowed */
      paymentMethod: 'credit_debit_card',
      /** only USD allowed */
      network: networkName,
      cryptoCurrencyCode,
      fiatCurrency: 'USD',
      fiatAmount: usdAmountToPay,
      walletAddress: masterEoa.address,
    });

    transak.init();

    // To get all the events
    Transak.on('*', (data: unknown) => {
      logEvent?.(`Transak event: ${JSON.stringify(data)}`);
    });

    Transak.on(Transak.EVENTS.TRANSAK_WIDGET_CLOSE, () => {
      onRampWindow?.hide?.();
    });

    Transak.on(Transak.EVENTS.TRANSAK_WIDGET_INITIALISED, () => {
      setIsWidgetLoading(false);
    });

    // This will trigger when the user marks payment is made.
    // User can close/navigate away at this event.
    Transak.on(Transak.EVENTS.TRANSAK_ORDER_SUCCESSFUL, () => {
      delayInSeconds(3).then(() => {
        onRampWindow?.transactionSuccess?.();
        transak.close();
      });
    });

    Transak.on(Transak.EVENTS.TRANSAK_ORDER_FAILED, () => {
      delayInSeconds(3).then(() => {
        transak.close();
        onRampWindow?.transactionFailure?.();
      });
    });

    return () => {
      transak.close();
    };
  }, [
    onRampWindow,
    masterEoa,
    usdAmountToPay,
    networkName,
    cryptoCurrencyCode,
    logEvent,
  ]);

  return (
    <Flex
      justify="center"
      align="center"
      vertical
      style={{ overflow: 'hidden' }}
    >
      <Title level={5} style={{ marginBottom: 24 }}>
        Buying crypto is in progress...
      </Title>

      <div id="transak-container" />
      {isWidgetLoading && <Spin />}
    </Flex>
  );
};
