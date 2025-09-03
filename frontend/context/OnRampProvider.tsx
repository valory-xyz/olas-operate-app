import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { EvmChainId, onRampChainMap } from '@/constants/chains';
import { Pages } from '@/enums/Pages';
import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { Nullable } from '@/types/Util';
import { delayInSeconds } from '@/utils/delay';
import {
  asEvmChainDetails,
  asMiddlewareChain,
} from '@/utils/middlewareHelpers';

const ETH_RECEIVED_THRESHOLD = 0.9;

export const OnRampContext = createContext<{
  networkId: Nullable<EvmChainId>;
  networkName: Nullable<string>;
  cryptoCurrencyCode: Nullable<string>;
  resetOnRampState: () => void;

  ethAmountToPay: Nullable<number>;
  updateEthAmountToPay: (amount: Nullable<number>) => void;
  usdAmountToPay: Nullable<number>;
  updateUsdAmountToPay: (amount: Nullable<number>) => void;
  isBuyCryptoBtnLoading: boolean;
  updateIsBuyCryptoBtnLoading: (loading: boolean) => void;

  // on-ramping step
  isOnRampingTransactionSuccessful: boolean;
  isTransactionSuccessfulButFundsNotReceived: boolean;
  isOnRampingStepCompleted: boolean;

  // swapping funds step
  isSwappingFundsStepCompleted: boolean;
  updateIsSwappingStepCompleted: (completed: boolean) => void;
}>({
  networkId: null,
  networkName: null,
  cryptoCurrencyCode: null,
  resetOnRampState: () => {},

  ethAmountToPay: null,
  updateEthAmountToPay: () => {},
  usdAmountToPay: null,
  updateUsdAmountToPay: () => {},
  isBuyCryptoBtnLoading: false,
  updateIsBuyCryptoBtnLoading: () => {},

  // on-ramping step
  isOnRampingTransactionSuccessful: false,
  isTransactionSuccessfulButFundsNotReceived: false,
  isOnRampingStepCompleted: false,

  // swapping funds step
  isSwappingFundsStepCompleted: false,
  updateIsSwappingStepCompleted: () => {},
});

export const OnRampProvider = ({ children }: PropsWithChildren) => {
  const { ipcRenderer, onRampWindow } = useElectronApi();
  const { pageState } = usePageState();
  const { selectedAgentConfig } = useServices();
  const { getMasterEoaBalanceOf } = useMasterBalances();

  // State to track the amount of ETH to pay for on-ramping and the USD equivalent
  const [ethAmountToPay, setEthAmountToPay] = useState<Nullable<number>>(null);
  const [usdAmountToPay, setUsdAmountToPay] = useState<Nullable<number>>(null);

  // State to track if the buy crypto button is loading
  const [isBuyCryptoBtnLoading, setIsBuyCryptoBtnLoading] = useState(false);

  // state to track if the on-ramping transaction was successful
  const [
    isOnRampingTransactionSuccessful,
    setIsOnRampingTransactionSuccessful,
  ] = useState(false);

  // State to track if the user has received funds after on-ramping
  const [hasFundsReceivedAfterOnRamp, setHasFundsReceivedAfterOnRamp] =
    useState(false);

  // State to track if the swapping step is completed
  const [isSwappingFundsStepCompleted, setIsSwappingStepCompleted] =
    useState(false);

  const updateIsBuyCryptoBtnLoading = useCallback((loading: boolean) => {
    setIsBuyCryptoBtnLoading(loading);
  }, []);

  /**
   * Check if the on-ramping step is completed
   * ie. if the on-ramping is successful AND funds are received in the master EOA.
   */
  const isOnRampingStepCompleted =
    isOnRampingTransactionSuccessful && hasFundsReceivedAfterOnRamp;

  /**
   * Check if the on-ramping transaction was successful but funds are not received
   */
  const isTransactionSuccessfulButFundsNotReceived =
    isOnRampingTransactionSuccessful && !hasFundsReceivedAfterOnRamp;

  // Get the network id, name, and crypto currency code based on the selected agent's home chain
  // This is used to determine the network and currency to on-ramp to.
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

  // check if the user has received funds after on-ramping to the master EOA
  useEffect(() => {
    if (!ethAmountToPay) return;
    if (isOnRampingStepCompleted) return;

    // Get the master EOA balance of the network to on-ramp
    const balance = getMasterEoaBalanceOf(networkId);
    if (!balance) return;

    // If the master EOA balance is greater than or equal to 90% of the ETH amount to pay,
    // considering that the user has received the funds after on-ramping.
    if (balance >= ethAmountToPay * ETH_RECEIVED_THRESHOLD) {
      updateIsBuyCryptoBtnLoading(false);
      setHasFundsReceivedAfterOnRamp(true);
      setIsOnRampingTransactionSuccessful(true);

      // If not closed already, close the on-ramp window after receiving funds
      onRampWindow?.close?.();
    }
  }, [
    ethAmountToPay,
    networkId,
    getMasterEoaBalanceOf,
    updateIsBuyCryptoBtnLoading,
    onRampWindow,
    isOnRampingStepCompleted,
  ]);

  // Function to set the ETH amount to pay for on-ramping
  const updateEthAmountToPay = useCallback((amount: Nullable<number>) => {
    setEthAmountToPay(amount);
  }, []);

  // Function to set the USD amount for on-ramping
  const updateUsdAmountToPay = useCallback((amount: Nullable<number>) => {
    setUsdAmountToPay(amount);
  }, []);

  // Function to set the swapping step completion state
  const updateIsSwappingStepCompleted = useCallback((completed: boolean) => {
    setIsSwappingStepCompleted(completed);
  }, []);

  // Listen for onramp window transaction failure event to reset the loading state
  useEffect(() => {
    const handleTransactionFailure = () => {
      updateIsBuyCryptoBtnLoading(false);
      setIsOnRampingTransactionSuccessful(false);
      delayInSeconds(0.5).then(() => onRampWindow?.close?.());
    };

    ipcRenderer?.on?.('onramp-transaction-failure', handleTransactionFailure);
    return () => {
      ipcRenderer?.removeListener?.(
        'onramp-transaction-failure',
        handleTransactionFailure,
      );
    };
  }, [ipcRenderer, onRampWindow, updateIsBuyCryptoBtnLoading]);

  useEffect(() => {
    const handleClose = () => {
      setIsBuyCryptoBtnLoading(false);
    };

    ipcRenderer?.on?.('onramp-window-did-close', handleClose);
    return () => {
      ipcRenderer?.removeListener?.('onramp-window-did-close', handleClose);
    };
  }, [ipcRenderer]);

  const resetOnRampState = useCallback(() => {
    setEthAmountToPay(null);
    setUsdAmountToPay(null);
    setIsBuyCryptoBtnLoading(false);
    setIsOnRampingTransactionSuccessful(false);
    setHasFundsReceivedAfterOnRamp(false);
    setIsSwappingStepCompleted(false);
  }, []);

  // Reset the on-ramp state when navigating to the main page
  useEffect(() => {
    if (pageState === Pages.Main) {
      const timer = setTimeout(() => resetOnRampState(), 1000);
      return () => clearTimeout(timer);
    }
  }, [pageState, resetOnRampState]);

  return (
    <OnRampContext.Provider
      value={{
        ethAmountToPay,
        updateEthAmountToPay,
        usdAmountToPay,
        updateUsdAmountToPay,
        isBuyCryptoBtnLoading,
        updateIsBuyCryptoBtnLoading,
        isOnRampingTransactionSuccessful,

        /** Whether the on-ramping step is completed */
        isOnRampingStepCompleted,
        isTransactionSuccessfulButFundsNotReceived,

        /** Whether the swapping step is completed */
        isSwappingFundsStepCompleted,
        updateIsSwappingStepCompleted,

        /** Network id to on-ramp */
        networkId,
        /** Network name to on-ramp */
        networkName,
        /** Crypto currency code to on-ramp */
        cryptoCurrencyCode,

        /** Function to reset the on-ramp state */
        resetOnRampState,
      }}
    >
      {children}
    </OnRampContext.Provider>
  );
};
