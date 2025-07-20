import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useElectronApi } from '@/hooks/useElectronApi';
import { Nullable } from '@/types/Util';
import { delayInSeconds } from '@/utils/delay';

export const OnRampContext = createContext<{
  usdAmountToPay: Nullable<number>;
  updateUsdAmountToPay: (amount: Nullable<number>) => void;
  isBuyCryptoBtnLoading: boolean;
  updateIsBuyCryptoBtnLoading: (loading: boolean) => void;
  isOnRampingTransactionSuccessful: boolean;
  updateIsOnRampingTransactionSuccessful: (successful: boolean) => void;
}>({
  usdAmountToPay: null,
  updateUsdAmountToPay: () => {},
  isBuyCryptoBtnLoading: false,
  updateIsBuyCryptoBtnLoading: () => {},
  isOnRampingTransactionSuccessful: false,
  updateIsOnRampingTransactionSuccessful: () => {},
});

/**
 * Shared provider to provide shared context to all components in the app.
 * @example
 * - Track the main OLAS balance animation state & mount state.
 * - Track the onboarding step of the user (independent of the agent).
 * - Track the healthcheck alert shown to the user (so that they are not shown again).
 */
export const OnRampProvider = ({ children }: PropsWithChildren) => {
  const { ipcRenderer, onRampWindow } = useElectronApi();

  // on ramping
  const [usdAmountToPay, setUsdAmountToPay] = useState<Nullable<number>>(null);
  const [isBuyCryptoBtnLoading, setIsBuyCryptoBtnLoading] = useState(false);

  // state to track if the onramp-ing transaction was successful (step 1)
  const [
    isOnRampingTransactionSuccessful,
    setIsOnRampingTransactionSuccessful,
  ] = useState(false);

  // Function to set the USD amount to pay
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

  return (
    <OnRampContext.Provider
      value={{
        usdAmountToPay,
        updateUsdAmountToPay,
        isBuyCryptoBtnLoading,
        updateIsBuyCryptoBtnLoading,
        isOnRampingTransactionSuccessful,
        updateIsOnRampingTransactionSuccessful,
      }}
    >
      {children}
    </OnRampContext.Provider>
  );
};
