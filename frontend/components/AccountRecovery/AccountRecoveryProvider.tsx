import { useQuery } from '@tanstack/react-query';
import { keys } from 'lodash';
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
  SupportedMiddlewareChain,
} from '@/constants';
import { useOnlineStatus } from '@/context/OnlineStatusProvider';
import { SetupScreen } from '@/enums';
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
        goto(SetupScreen.Welcome);
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
  hasBackupWallets: boolean;
  /** Current step in the account recovery flow */
  currentStep: RecoverySteps;
  /** Address of the backup wallet used for recovery */
  backupWalletAddress?: Address;
  newMasterEoaAddress?: Address;
  updateNewMasterEoaAddress: (newAddress: Address, oldAddress: Address) => void;

  // Step: Fund Your Backup Wallet
  isRecoveryFundingListLoading: boolean;
  recoveryFundingList: TokenRequirementsRow[];

  // Step: Approve with Backup Wallet
  /** Total safe swaps required for recovery */
  safeSwapTransactions: SwapSafeTransaction[];

  /** Callback to proceed to the next step in recovery */
  onNext: () => void;
  /** Callback to go back to the previous step in recovery */
  onPrev: () => void;
}>({
  isLoading: true,
  currentStep: RECOVERY_STEPS.SelectRecoveryMethod,
  isRecoveryAvailable: false,
  hasBackupWallets: false,
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

  const { data: extendedWallets, isLoading: isExtendedWalletLoading } =
    useQuery({
      queryKey: REACT_QUERY_KEYS.EXTENDED_WALLET_KEY,
      queryFn: async ({ signal }) =>
        await RecoveryService.getExtendedWallet(signal),
      enabled: isOnline,
      refetchInterval: FIFTEEN_SECONDS_INTERVAL,
      select: (data) => data[0],
    });

  const canFetchRecoveryFundingRequirements =
    currentStep === RECOVERY_STEPS.FundYourBackupWallet ||
    currentStep === RECOVERY_STEPS.ApproveWithBackupWallet;

  const {
    data: recoveryFundingRequirements,
    isLoading: isRecoveryFundingRequirementsLoading,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.RECOVERY_FUNDING_REQUIREMENTS_KEY,
    queryFn: async ({ signal }) =>
      await RecoveryService.getRecoveryFundingRequirements(signal),
    enabled: canFetchRecoveryFundingRequirements && isOnline,
    // Only refetch when in funding or approval steps
    refetchInterval: canFetchRecoveryFundingRequirements
      ? FIFTEEN_SECONDS_INTERVAL
      : false,
  });

  const isLoading = isMasterWalletLoading || isExtendedWalletLoading;

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
    if (!recoveryFundingRequirements) return [];
    return parseRecoveryFundingRequirements(recoveryFundingRequirements);
  }, [recoveryFundingRequirements]);

  const isRecoveryAvailable = !!(
    backupWalletDetails?.areAllBackupOwnersSame &&
    backupWalletDetails?.hasBackupWalletsAcrossEveryChain
  );
  const hasBackupWallets =
    !!backupWalletDetails?.hasBackupWalletsAcrossEveryChain;
  const backupWalletAddress = isRecoveryAvailable
    ? (backupWalletDetails?.backupAddress as Address)
    : undefined;

  const safeSwapTransactions: SwapSafeTransaction[] = useMemo(() => {
    if (!extendedWallets?.safe_chains) return [];
    if (!backupWalletAddress) return [];
    if (!oldMasterEoaAddress) return [];
    if (!newMasterEoaAddress) return [];
    if (!recoveryFundingRequirements) return [];

    return extendedWallets.safe_chains.map(
      (chain: SupportedMiddlewareChain) => {
        // generally only one safe is present per chain.
        const safeAddress = keys(
          recoveryFundingRequirements?.total_requirements[chain],
        )[0];

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
    backupWalletAddress,
    oldMasterEoaAddress,
    newMasterEoaAddress,
    recoveryFundingRequirements,
  ]);

  return (
    <AccountRecoveryContext.Provider
      value={{
        isLoading,
        isRecoveryAvailable,
        hasBackupWallets,
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
