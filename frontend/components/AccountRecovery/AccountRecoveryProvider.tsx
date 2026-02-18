import { useQuery } from '@tanstack/react-query';
import { isEmpty, keys } from 'lodash';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  FIFTEEN_SECONDS_INTERVAL,
  REACT_QUERY_KEYS,
  SETUP_SCREEN,
  SupportedMiddlewareChain,
} from '@/constants';
import { useOnlineStatus } from '@/context/OnlineStatusProvider';
import { useMasterWalletContext, useSetup } from '@/hooks';
import { RecoveryService } from '@/service/Recovery';
import { Address } from '@/types';
import { SwapSafeTransaction } from '@/types/Recovery';

import { TokenRequirementsRow } from '../ui';
import { RECOVERY_STEPS, RecoverySteps } from './constants';
import {
  getBackupWalletStatus,
  parseRecoveryFundingRequirements,
} from './utils';

const useRecoveryNavigation = (
  currentStep: RecoverySteps,
  updateCurrentStep: (state: RecoverySteps) => void,
) => {
  const { goto } = useSetup();

  const onNext = useCallback(() => {
    switch (currentStep) {
      case RECOVERY_STEPS.SelectRecoveryMethod:
        updateCurrentStep(RECOVERY_STEPS.CreateNewPassword);
        break;
      case RECOVERY_STEPS.CreateNewPassword:
        updateCurrentStep(RECOVERY_STEPS.FundYourBackupWallet);
        break;
      case RECOVERY_STEPS.FundYourBackupWallet:
        updateCurrentStep(RECOVERY_STEPS.ApproveWithBackupWallet);
        break;
      case RECOVERY_STEPS.ApproveWithBackupWallet:
        goto(SETUP_SCREEN.Welcome);
        break;
      default:
        break;
    }
  }, [updateCurrentStep, goto, currentStep]);

  const onPrev = useCallback(() => {
    switch (currentStep) {
      case RECOVERY_STEPS.CreateNewPassword:
        updateCurrentStep(RECOVERY_STEPS.SelectRecoveryMethod);
        break;
      case RECOVERY_STEPS.FundYourBackupWallet:
        updateCurrentStep(RECOVERY_STEPS.CreateNewPassword);
        break;
      case RECOVERY_STEPS.ApproveWithBackupWallet:
        updateCurrentStep(RECOVERY_STEPS.FundYourBackupWallet);
        break;
      default:
        break;
    }
  }, [currentStep, updateCurrentStep]);

  return { onNext, onPrev };
};

const AccountRecoveryContext = createContext<{
  isLoading: boolean;
  /** Indicates if account recovery is available based on backup wallet */
  isRecoveryAvailable: boolean;
  /** Indicates if there are backup wallets across every chain */
  hasBackupWalletsAcrossEveryChain: boolean;
  /** Indicates if all backup owners are the same across chains */
  areAllBackupOwnersSame: boolean;
  /** Current step in the account recovery flow */
  /** Address of the backup wallet used for recovery */
  backupWalletAddress?: Address;
  /** New master EOA address set during recovery */
  newMasterEoaAddress?: Address;
  /** Updates the new master EOA address during recovery */
  updateNewMasterEoaAddress: (newAddress: Address, oldAddress: Address) => void;

  // Step: Fund Your Backup Wallet
  isRecoveryFundingListLoading: boolean;
  recoveryFundingList: TokenRequirementsRow[];

  // Step: Approve with Backup Wallet
  /** Total safe swaps required for recovery */
  safeSwapTransactions: SwapSafeTransaction[];

  // Navigation
  currentStep: RecoverySteps;
  onNext: () => void;
  onPrev: () => void;
}>({
  isLoading: true,
  currentStep: RECOVERY_STEPS.SelectRecoveryMethod,
  isRecoveryAvailable: false,
  hasBackupWalletsAcrossEveryChain: false,
  areAllBackupOwnersSame: false,
  updateNewMasterEoaAddress: () => {},
  isRecoveryFundingListLoading: false,
  recoveryFundingList: [],
  safeSwapTransactions: [],
  onNext: () => {},
  onPrev: () => {},
});

export const AccountRecoveryProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { isOnline } = useOnlineStatus();
  const { masterSafes, isLoading: isMasterWalletLoading } =
    useMasterWalletContext();

  const [currentStep, setCurrentStep] = useState<RecoverySteps>(
    RECOVERY_STEPS.SelectRecoveryMethod,
  );
  const [newMasterEoaAddress, setNewMasterEoaAddress] = useState<Address>();
  const [oldMasterEoaAddress, setOldMasterEoaAddress] = useState<Address>();
  const { onNext, onPrev } = useRecoveryNavigation(
    currentStep,
    useCallback((step: RecoverySteps) => setCurrentStep(step), []),
  );

  const canFetchRecoveryFundingRequirements =
    currentStep === RECOVERY_STEPS.FundYourBackupWallet ||
    currentStep === RECOVERY_STEPS.ApproveWithBackupWallet;

  const { data: extendedWallets, isLoading: isExtendedWalletLoading } =
    useQuery({
      queryKey: REACT_QUERY_KEYS.EXTENDED_WALLET_KEY,
      queryFn: async ({ signal }) =>
        await RecoveryService.getExtendedWallet(signal),
      enabled: !canFetchRecoveryFundingRequirements && isOnline,
      select: (data) => data[0],
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: Infinity,
    });

  const {
    data: recoveryFundingRequirements,
    isLoading: isRecoveryFundingRequirementsLoading,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.RECOVERY_FUNDING_REQUIREMENTS_KEY,
    queryFn: async ({ signal }) =>
      await RecoveryService.getRecoveryFundingRequirements(signal),
    enabled: canFetchRecoveryFundingRequirements && isOnline,
    refetchInterval: canFetchRecoveryFundingRequirements
      ? FIFTEEN_SECONDS_INTERVAL
      : false,
  });

  const isLoading = isMasterWalletLoading || isExtendedWalletLoading;

  // Determine backup wallet details for recovery
  const backupWalletDetails = useMemo(() => {
    if (isLoading) return;
    if (!extendedWallets?.safes) return;
    if (!masterSafes) return;
    return getBackupWalletStatus(extendedWallets.safes, masterSafes);
  }, [masterSafes, extendedWallets, isLoading]);

  const updateNewMasterEoaAddress = useCallback(
    (newAddress: Address, oldAddress: Address) => {
      setNewMasterEoaAddress(newAddress);
      setOldMasterEoaAddress(oldAddress);
    },
    [],
  );

  const recoveryFundingList = useMemo(() => {
    if (isEmpty(recoveryFundingRequirements)) return [];
    return parseRecoveryFundingRequirements(recoveryFundingRequirements);
  }, [recoveryFundingRequirements]);

  const isRecoveryAvailable = !!(
    backupWalletDetails?.areAllBackupOwnersSame &&
    backupWalletDetails?.hasBackupWalletsAcrossEveryChain
  );

  const backupWalletAddress = isRecoveryAvailable
    ? (backupWalletDetails?.backupAddress as Address)
    : undefined;

  // Prepare safe swap transactions for recovery approval step
  const safeSwapTransactions: SwapSafeTransaction[] = useMemo(() => {
    if (!extendedWallets?.safe_chains) return [];
    if (!backupWalletAddress) return [];
    if (!oldMasterEoaAddress) return [];
    if (!newMasterEoaAddress) return [];

    return extendedWallets.safe_chains.map(
      (chain: SupportedMiddlewareChain) => {
        const safeAddress = keys(extendedWallets.safes[chain])[0];

        if (!safeAddress) {
          throw new Error(
            `No safe address found for chain ${chain} in recovery funding requirements`,
          );
        }

        return {
          chain,
          signerAddress: backupWalletAddress,
          safeAddress: safeAddress as Address,
          oldMasterEoaAddress,
          newMasterEoaAddress,
        };
      },
    );
  }, [
    extendedWallets?.safe_chains,
    extendedWallets?.safes,
    backupWalletAddress,
    oldMasterEoaAddress,
    newMasterEoaAddress,
  ]);

  return (
    <AccountRecoveryContext.Provider
      value={{
        isLoading,
        isRecoveryAvailable,
        areAllBackupOwnersSame: !!backupWalletDetails?.areAllBackupOwnersSame,
        hasBackupWalletsAcrossEveryChain:
          !!backupWalletDetails?.hasBackupWalletsAcrossEveryChain,
        currentStep,
        backupWalletAddress: isRecoveryAvailable
          ? (backupWalletDetails?.backupAddress as Address)
          : undefined,
        newMasterEoaAddress,
        isRecoveryFundingListLoading: isRecoveryFundingRequirementsLoading,
        recoveryFundingList,
        safeSwapTransactions,
        updateNewMasterEoaAddress,
        onNext,
        onPrev,
      }}
    >
      {children}
    </AccountRecoveryContext.Provider>
  );
};

export const useAccountRecoveryContext = () => {
  const context = useContext(AccountRecoveryContext);
  if (!context) {
    throw new Error(
      'useAccountRecoveryContext must be used within a AccountRecoveryProvider',
    );
  }
  return context;
};
