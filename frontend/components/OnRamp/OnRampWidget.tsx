import { Transak } from '@transak/transak-sdk';
import { Flex, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { useElectronApi } from '@/hooks/useElectronApi';
import { useSharedContext } from '@/hooks/useSharedContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
/**
 * https://docs.transak.com/docs/transak-sdk
 */
export const OnRampWidget = () => {
  const { onRampWindow } = useElectronApi();
  const [isLoading, setIsLoading] = useState(true);
  const { masterEoa } = useMasterWalletContext();
  const { updateIsBuyCryptoBtnLoading } = useSharedContext();

  // TODO: dynamic fields, should get from query parameters

  useEffect(() => {
    console.log('OnRampWidget mounted', masterEoa);
    if (!masterEoa?.address) return;

    // if (1 + 1 === 2) return;
    console.log(process.env.TRANSAK_API_KEY);
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
      fiatAmount: 500, // TODO: dynamic
      fiatCurrency: 'USD',
      cryptoCurrencyCode: 'ETH', // TODO: dynamic
      walletAddress: masterEoa.address,
    });

    transak.init();

    // To get all the events
    Transak.on('*', (data) => {
      console.log(data);
    });

    // This will trigger when the user closed the widget
    Transak.on(Transak.EVENTS.TRANSAK_WIDGET_CLOSE, () => {
      updateIsBuyCryptoBtnLoading(false);
      console.log('Transak SDK closed!');
      onRampWindow?.hide?.();
    });

    // This will trigger when the widget is loaded
    Transak.on(Transak.EVENTS.TRANSAK_WIDGET_INITIALISED, () => {
      console.log('Transak is loaded!');
      setIsLoading(false);
    });

    /*
     * This will trigger when the user has confirmed the order
     * This doesn't guarantee that payment has completed in all scenarios
     * If you want to close/navigate away, use the TRANSAK_ORDER_SUCCESSFUL event
     */
    Transak.on(Transak.EVENTS.TRANSAK_ORDER_CREATED, (orderData) => {
      console.log(orderData);
    });

    /*
     * This will trigger when the user marks payment is made
     * You can close/navigate away at this event
     */
    Transak.on(Transak.EVENTS.TRANSAK_ORDER_SUCCESSFUL, (orderData) => {
      console.log(orderData);
      transak.close();
      updateIsBuyCryptoBtnLoading(false);
    });

    return () => {
      transak.close();
      updateIsBuyCryptoBtnLoading(false);
    };
  }, [onRampWindow]);

  return (
    <>
      <Flex justify="center" align="center" vertical>
        <Typography.Title level={3} style={{ marginBottom: 24 }}>
          Buy via fiat
        </Typography.Title>
        <div id="transak-container" />
        {isLoading && <Spin />}
      </Flex>
    </>
  );
};
