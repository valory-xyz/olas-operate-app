import { Transak } from '@transak/transak-sdk';
import { Flex, Spin, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { onRampChainMap } from '@/constants/chains';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import {
  asEvmChainDetails,
  asMiddlewareChain,
} from '@/utils/middlewareHelpers';

import { useOnRampMessage } from './useOnRampMessage';

const { Title } = Typography;

type OnRampWidgetProps = {
  usdAmountToPay: number;
};

export const OnRampWidget = ({ usdAmountToPay }: OnRampWidgetProps) => {
  const { onRampWindow } = useElectronApi();
  const { selectedAgentConfig } = useServices();

  const { masterEoa } = useMasterWalletContext();

  // TODO: move to context
  const { network, cryptoCurrencyCode } = useMemo(() => {
    const fromChainName = asMiddlewareChain(selectedAgentConfig.evmHomeChainId);
    const onRampChainName = asMiddlewareChain(onRampChainMap[fromChainName]);
    const chainDetails = asEvmChainDetails(onRampChainName);
    return {
      network: chainDetails.name,
      cryptoCurrencyCode: chainDetails.symbol,
    };
  }, [selectedAgentConfig]);

  const {
    updateIsBuyCryptoBtnLoading,
    updateIsOnRampingTransactionSuccessful,
  } = useOnRampContext();
  const {
    orderInProgressMessage,
    successfulTransactionMessage,
    errorTransactionMessage,
  } = useOnRampMessage();

  const [isWidgetLoading, setIsWidgetLoading] = useState(true);

  useEffect(() => {
    if (!masterEoa?.address) return;

    // Transak SDK requires a valid amount to proceed
    if (!usdAmountToPay) return;

    // Check if Transak API key is set
    if (!process.env.TRANSAK_API_KEY) {
      console.error('TRANSAK_API_KEY is not set');
      return;
    }

    /**
     * https://docs.transak.com/docs/transak-sdk
     */
    const transak = new Transak({
      apiKey: process.env.TRANSAK_API_KEY,
      environment: Transak.ENVIRONMENTS.STAGING, // or 'PRODUCTION' // TODO: how to know which environment to use?
      widgetHeight: '700px',
      widgetWidth: '500px',
      /** default to BUY */
      productsAvailed: 'BUY',
      /** only credit_debit_card allowed */
      paymentMethod: 'credit_debit_card',
      /** only USD allowed */
      network,
      cryptoCurrencyCode,
      fiatCurrency: 'USD',
      fiatAmount: usdAmountToPay,
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
      onRampWindow?.transactionSuccess?.();
    });

    // This will trigger when the user marks payment is failed.
    Transak.on(Transak.EVENTS.TRANSAK_ORDER_FAILED, () => {
      updateIsBuyCryptoBtnLoading(false);
      errorTransactionMessage();
      transak.close();
      onRampWindow?.hide?.();
    });

    return () => {
      transak.close();
      updateIsBuyCryptoBtnLoading(false);
    };
  }, [
    onRampWindow,
    masterEoa,
    usdAmountToPay,
    network,
    cryptoCurrencyCode,
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
