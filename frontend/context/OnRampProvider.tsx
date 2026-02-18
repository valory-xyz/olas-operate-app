import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { OnRampNetworkConfig } from '@/components/OnRamp';
import { PAGES } from '@/constants';
import {
  useElectronApi,
  useMasterBalances,
  useMasterWalletContext,
  usePageState,
} from '@/hooks';
import { Nullable } from '@/types';
import { delayInSeconds, parseEther } from '@/utils';

const ETH_RECEIVED_THRESHOLD = 0.9;

export const OnRampContext = createContext<{
  networkId: OnRampNetworkConfig['networkId'];
  networkName: OnRampNetworkConfig['networkName'];
  cryptoCurrencyCode: OnRampNetworkConfig['cryptoCurrencyCode'];
  /**
   * Chain to which the funds are being transferred. It can have two cases:
   * 1. Onboarding: homeChainId of the selected agent
   * 2. Depositing: chainId to which the user is depositing new funds
   */
  selectedChainId: OnRampNetworkConfig['selectedChainId'];
  updateNetworkConfig: (config: OnRampNetworkConfig) => void;
  resetOnRampState: () => void;

  nativeAmountToPay: Nullable<number>;
  updateNativeAmountToPay: (amount: Nullable<number>) => void;
  nativeTotalAmountRequired: Nullable<number>;
  updateNativeTotalAmountRequired: (amount: Nullable<number>) => void;
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
  selectedChainId: null,
  updateNetworkConfig: () => {},
  resetOnRampState: () => {},

  nativeAmountToPay: null,
  updateNativeAmountToPay: () => {},
  nativeTotalAmountRequired: null,
  updateNativeTotalAmountRequired: () => {},
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
  const { getMasterEoaNativeBalanceOf, getMasterSafeNativeBalanceOf } =
    useMasterBalances();
  const { getMasterSafeOf, isFetched: isMasterWalletFetched } =
    useMasterWalletContext();

  // State to track the amount of native tokens (e.g., ETH, POL, etc.) to pay for on-ramping and the USD equivalent
  const [nativeAmountToPay, setNativeAmountToPay] =
    useState<Nullable<number>>(null);
  const [nativeTotalAmountRequired, setNativeTotalAmountRequired] =
    useState<Nullable<number>>(null);
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

  // Ref to store the initial balance when on-ramping starts
  // Used to calculate if balance increased by the expected amount
  const initialBalanceRef = useRef<string | null>(null);

  const updateIsBuyCryptoBtnLoading = useCallback((loading: boolean) => {
    setIsBuyCryptoBtnLoading(loading);
  }, []);

  const [networkConfig, setNetworkConfig] = useState<OnRampNetworkConfig>({
    networkId: null,
    networkName: null,
    cryptoCurrencyCode: null,
    selectedChainId: null,
  });

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

  const { networkId, networkName, cryptoCurrencyCode, selectedChainId } =
    networkConfig;

  // Store initial balance when on-ramp requirements are calculated
  // This happens early when nativeAmountToPay is first set, before user clicks "Buy Crypto"
  useEffect(() => {
    if (!nativeAmountToPay) return;
    if (!isMasterWalletFetched) return;
    if (!networkId) return;
    if (initialBalanceRef.current !== null) return;

    // Get the master safe (in case it exists) or master EOA balance of the network to on-ramp
    const hasMasterSafe = getMasterSafeOf?.(networkId);
    const balance = hasMasterSafe
      ? getMasterSafeNativeBalanceOf(networkId)?.[0]?.balanceString
      : getMasterEoaNativeBalanceOf(networkId);

    initialBalanceRef.current = balance || '0';
  }, [
    nativeAmountToPay,
    networkId,
    isMasterWalletFetched,
    getMasterSafeOf,
    getMasterSafeNativeBalanceOf,
    getMasterEoaNativeBalanceOf,
  ]);

  // check if the user has received funds after on-ramping
  useEffect(() => {
    if (!nativeAmountToPay) return;
    if (!usdAmountToPay) return;
    if (isOnRampingStepCompleted) return;
    if (!isMasterWalletFetched) return;
    if (!networkId) return;
    if (initialBalanceRef.current === null) return; // Need initial balance first

    // Get the master safe (in case it exists) or master EOA balance of the network to on-ramp
    const hasMasterSafe = getMasterSafeOf?.(networkId);
    const currentBalance = hasMasterSafe
      ? getMasterSafeNativeBalanceOf(networkId)?.[0]?.balanceString
      : getMasterEoaNativeBalanceOf(networkId);
    if (!currentBalance) return;

    // Calculate the expected increase in balance (90% threshold)
    const thresholdAmount = (
      nativeAmountToPay * ETH_RECEIVED_THRESHOLD
    ).toFixed(18);

    // Calculate the actual increase in balance
    const balanceBeforeOnRamp = BigInt(parseEther(initialBalanceRef.current));
    const balanceAfterOnRamp = BigInt(parseEther(currentBalance.toString()));
    const balanceIncrease = balanceAfterOnRamp - balanceBeforeOnRamp;

    // Check if balance increased by at least the threshold amount
    if (balanceIncrease >= BigInt(parseEther(thresholdAmount))) {
      updateIsBuyCryptoBtnLoading(false);
      setHasFundsReceivedAfterOnRamp(true);
      setIsOnRampingTransactionSuccessful(true);

      // If not closed already, close the on-ramp window after receiving funds
      onRampWindow?.close?.();
    }
  }, [
    nativeAmountToPay,
    networkId,
    getMasterEoaNativeBalanceOf,
    updateIsBuyCryptoBtnLoading,
    onRampWindow,
    isOnRampingStepCompleted,
    isMasterWalletFetched,
    getMasterSafeOf,
    getMasterSafeNativeBalanceOf,
    usdAmountToPay,
  ]);

  // Function to set the native token amount to pay for on-ramping
  const updateNativeAmountToPay = useCallback((amount: Nullable<number>) => {
    setNativeAmountToPay(amount);
  }, []);

  // Function to set the total native token amount required for on-ramping
  // (including what could possibly be on the balance + newly requested remaining amount to pay)
  const updateNativeTotalAmountRequired = useCallback(
    (amount: Nullable<number>) => {
      setNativeTotalAmountRequired(amount);
    },
    [],
  );

  // Function to set the USD amount for on-ramping
  const updateUsdAmountToPay = useCallback((amount: Nullable<number>) => {
    setUsdAmountToPay(amount);
  }, []);

  // Function to set the swapping step completion state
  const updateIsSwappingStepCompleted = useCallback((completed: boolean) => {
    setIsSwappingStepCompleted(completed);
  }, []);

  // Function to set the network config
  const updateNetworkConfig = useCallback((config: OnRampNetworkConfig) => {
    setNetworkConfig(config);
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
    setNativeAmountToPay(null);
    setUsdAmountToPay(null);
    setIsBuyCryptoBtnLoading(false);
    setIsOnRampingTransactionSuccessful(false);
    setHasFundsReceivedAfterOnRamp(false);
    setIsSwappingStepCompleted(false);
    initialBalanceRef.current = null;
  }, []);

  // Reset the on-ramp state when navigating to the main page
  useEffect(() => {
    if (pageState === PAGES.Main) {
      const timer = setTimeout(() => resetOnRampState(), 1000);
      return () => clearTimeout(timer);
    }
  }, [pageState, resetOnRampState]);

  return (
    <OnRampContext.Provider
      value={{
        nativeAmountToPay,
        updateNativeAmountToPay,
        nativeTotalAmountRequired,
        updateNativeTotalAmountRequired,
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
        /** Chain to which the funds are eventually transferred */
        selectedChainId,
        /** Function to update the network config */
        updateNetworkConfig,

        /** Function to reset the on-ramp state */
        resetOnRampState,
      }}
    >
      {children}
    </OnRampContext.Provider>
  );
};
