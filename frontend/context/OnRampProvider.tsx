import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { EvmChainId, onRampChainMap } from '@/constants/chains';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';
import { Nullable } from '@/types/Util';
import { delayInSeconds } from '@/utils/delay';
import {
  asEvmChainDetails,
  asMiddlewareChain,
} from '@/utils/middlewareHelpers';

export const OnRampContext = createContext<{
  usdAmountToPay: Nullable<number>;
  updateUsdAmountToPay: (amount: Nullable<number>) => void;
  isBuyCryptoBtnLoading: boolean;
  updateIsBuyCryptoBtnLoading: (loading: boolean) => void;
  isOnRampingTransactionSuccessful: boolean;
  updateIsOnRampingTransactionSuccessful: (successful: boolean) => void;

  networkId: Nullable<EvmChainId>;
  networkName: Nullable<string>;
  cryptoCurrencyCode: Nullable<string>;
}>({
  usdAmountToPay: null,
  updateUsdAmountToPay: () => {},
  isBuyCryptoBtnLoading: false,
  updateIsBuyCryptoBtnLoading: () => {},
  isOnRampingTransactionSuccessful: false,
  updateIsOnRampingTransactionSuccessful: () => {},

  networkId: null,
  networkName: null,
  cryptoCurrencyCode: null,
});

export const OnRampProvider = ({ children }: PropsWithChildren) => {
  const { ipcRenderer, onRampWindow } = useElectronApi();
  const { selectedAgentConfig } = useServices();

  const [usdAmountToPay, setUsdAmountToPay] = useState<Nullable<number>>(null);
  const [isBuyCryptoBtnLoading, setIsBuyCryptoBtnLoading] = useState(false);

  // state to track if the on-ramping transaction was successful (step 1)
  const [
    isOnRampingTransactionSuccessful,
    setIsOnRampingTransactionSuccessful,
  ] = useState(false);

  // Function to set the USD amount for on-ramping
  const updateUsdAmountToPay = useCallback((amount: Nullable<number>) => {
    setUsdAmountToPay(amount);
  }, []);

  const updateIsBuyCryptoBtnLoading = useCallback((loading: boolean) => {
    setIsBuyCryptoBtnLoading(loading);
  }, []);

  const updateIsOnRampingTransactionSuccessful = useCallback(
    (successful: boolean) => {
      setIsOnRampingTransactionSuccessful(successful);
    },
    [],
  );

  // Listen for onramp window hide event to reset the loading state
  useEffect(() => {
    const handleHide = () => {
      updateIsBuyCryptoBtnLoading(false);
    };

    ipcRenderer?.on?.('onramp-window-did-hide', handleHide);
    return () => {
      ipcRenderer?.removeListener?.('onramp-window-did-hide', handleHide);
    };
  }, [ipcRenderer, updateIsBuyCryptoBtnLoading]);

  // Listen for onramp window transaction success event to reset the loading state
  useEffect(() => {
    const handleTransactionSuccess = () => {
      updateIsBuyCryptoBtnLoading(false);
      updateIsOnRampingTransactionSuccessful(true);
      delayInSeconds(1).then(() => onRampWindow?.hide?.());
    };

    ipcRenderer?.on?.('onramp-transaction-success', handleTransactionSuccess);
    return () => {
      ipcRenderer?.removeListener?.(
        'onramp-transaction-success',
        handleTransactionSuccess,
      );
    };
  }, [
    ipcRenderer,
    onRampWindow,
    updateIsBuyCryptoBtnLoading,
    updateIsOnRampingTransactionSuccessful,
  ]);

  // Listen for onramp window transaction failure event to reset the loading state
  useEffect(() => {
    const handleTransactionFailure = () => {
      updateIsBuyCryptoBtnLoading(false);
      updateIsOnRampingTransactionSuccessful(false);
      delayInSeconds(1).then(() => onRampWindow?.hide?.());
    };

    ipcRenderer?.on?.('onramp-transaction-failure', handleTransactionFailure);
    return () => {
      ipcRenderer?.removeListener?.(
        'onramp-transaction-failure',
        handleTransactionFailure,
      );
    };
  }, [
    ipcRenderer,
    onRampWindow,
    updateIsBuyCryptoBtnLoading,
    updateIsOnRampingTransactionSuccessful,
  ]);

  const { networkId, networkName, cryptoCurrencyCode } = useMemo(() => {
    const fromChainName = asMiddlewareChain(selectedAgentConfig.evmHomeChainId);
    const networkId = onRampChainMap[fromChainName];
    const chainDetails = asEvmChainDetails(asMiddlewareChain(networkId));
    return {
      networkId,
      networkName: chainDetails.name,
      cryptoCurrencyCode: chainDetails.symbol,
    };
  }, [selectedAgentConfig]);

  return (
    <OnRampContext.Provider
      value={{
        usdAmountToPay,
        updateUsdAmountToPay,
        isBuyCryptoBtnLoading,
        updateIsBuyCryptoBtnLoading,
        isOnRampingTransactionSuccessful,
        updateIsOnRampingTransactionSuccessful,

        /** Network id to on-ramp */
        networkId,
        /** Network name to on-ramp */
        networkName,
        /** Crypto currency code to on-ramp */
        cryptoCurrencyCode,
      }}
    >
      {children}
    </OnRampContext.Provider>
  );
};
