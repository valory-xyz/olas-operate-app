import { Transak } from '@transak/transak-sdk';
import { Flex, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { useElectronApi } from '@/hooks/useElectronApi';
import { useSharedContext } from '@/hooks/useSharedContext';
import { useMasterWalletContext } from '@/hooks/useWallet';

import { useOnRampMessage } from './useOnRampMessage';

const { Title } = Typography;

/**
 * https://docs.transak.com/docs/transak-sdk
 */
export const OnRampWidget = () => {
  const { onRampWindow } = useElectronApi();
  const [isWidgetLoading, setIsWidgetLoading] = useState(true);
  const { masterEoa } = useMasterWalletContext();
  const {
    usdAmountToPay,
    updateIsBuyCryptoBtnLoading,
    updateIsOnRampingTransactionSuccessful,
  } = useSharedContext();
  const {
    orderInProgressMessage,
    successfulTransactionMessage,
    errorTransactionMessage,
  } = useOnRampMessage();

  console.log('OnRampWidget', {
    onRampWindow,
    masterEoa,
    usdAmountToPay,
  });

  // TODO: dynamic fields, should get from query parameters

  useEffect(() => {
    if (!masterEoa?.address) return;

    // Transak SDK requires a valid amount to proceed
    if (!usdAmountToPay) return;

    const transak = new Transak({
      apiKey: process.env.TRANSAK_API_KEY as string,
      environment: Transak.ENVIRONMENTS.STAGING, // or 'PRODUCTION'
      // widgetHeight: '100%',
      // widgetWidth: '100%',
      widgetHeight: '700px',
      widgetWidth: '500px',
      network: 'optimism', // TODO: dynamic
      productsAvailed: 'BUY', // Default
      paymentMethod: 'credit_debit_card',
      fiatAmount: usdAmountToPay, // TODO: dynamic
      fiatCurrency: 'USD',
      cryptoCurrencyCode: 'ETH', // TODO: dynamic
      walletAddress: masterEoa.address,
    });

    transak.init();

    // TODO: add all the events to logger from here.
    // To get all the events
    // Transak.on('*', (data) => {});

    // This will trigger when the user closed the widget
    Transak.on(Transak.EVENTS.TRANSAK_WIDGET_CLOSE, () => {
      updateIsBuyCryptoBtnLoading(false);
      onRampWindow?.hide?.();
    });

    // This will trigger when the widget is loaded
    Transak.on(Transak.EVENTS.TRANSAK_WIDGET_INITIALISED, () => {
      setIsWidgetLoading(false);
    });

    // This will trigger when the user has confirmed the order.
    // This doesn't guarantee that payment has completed in all scenarios.
    Transak.on(Transak.EVENTS.TRANSAK_ORDER_CREATED, () => {
      orderInProgressMessage();
    });

    // This will trigger when the user marks payment is made.
    // User can close/navigate away at this event.
    Transak.on(Transak.EVENTS.TRANSAK_ORDER_SUCCESSFUL, () => {
      successfulTransactionMessage();
      updateIsBuyCryptoBtnLoading(false);
      updateIsOnRampingTransactionSuccessful(true);
      transak.close();
      onRampWindow?.hide?.();
    });

    // This will trigger when the user marks payment is failed.
    Transak.on(Transak.EVENTS.TRANSAK_ORDER_FAILED, () => {
      transak.close();
      updateIsBuyCryptoBtnLoading(false);
      errorTransactionMessage();
    });

    return () => {
      transak.close();
      updateIsBuyCryptoBtnLoading(false);
    };
  }, [
    onRampWindow,
    masterEoa,
    usdAmountToPay,
    updateIsOnRampingTransactionSuccessful,
    updateIsBuyCryptoBtnLoading,
    successfulTransactionMessage,
    errorTransactionMessage,
    orderInProgressMessage,
  ]);

  return (
    <>
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
    </>
  );
};
