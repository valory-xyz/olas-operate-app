import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { FIFTEEN_SECONDS_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { useOnlineStatus } from '@/context/OnlineStatusProvider';
import { SetupScreen } from '@/enums';
import { useMasterWalletContext, useSetup } from '@/hooks';
import { RecoveryService } from '@/service/Recovery';
import { Address } from '@/types';

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
  updateNewPasswordMasterEoaAddress: (address: Address) => void;
  isRecoveryFundingListLoading: boolean;
  recoveryFundingList: TokenRequirementsRow[];
  /** Callback to proceed to the next step in recovery */
  onNext: () => void;
  /** Callback to go back to the previous step in recovery */
  onPrev: () => void;
}>({
  isLoading: true,
  currentStep: RECOVERY_STEPS.SelectRecoveryMethod,
  isRecoveryAvailable: false,
  hasBackupWallets: false,
  updateNewPasswordMasterEoaAddress: () => {},
  isRecoveryFundingListLoading: false,
  recoveryFundingList: [],
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
    RECOVERY_STEPS.CreateNewPassword,
  );
  const [newMasterEoaAddress, setNewMasterEoaAddress] = useState<Address>();
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

  const isRecoveryAvailable = !!(
    backupWalletDetails?.areAllBackupOwnersSame &&
    backupWalletDetails?.hasBackupWalletsAcrossEveryChain
  );

  const hasBackupWallets =
    !!backupWalletDetails?.hasBackupWalletsAcrossEveryChain;

  const updateNewPasswordMasterEoaAddress = useCallback((address: Address) => {
    setNewMasterEoaAddress(address);
  }, []);

  const recoveryFundingList = useMemo(() => {
    if (!recoveryFundingRequirements) return [];
    return parseRecoveryFundingRequirements(recoveryFundingRequirements);
  }, [recoveryFundingRequirements]);

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
        updateNewPasswordMasterEoaAddress,
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
