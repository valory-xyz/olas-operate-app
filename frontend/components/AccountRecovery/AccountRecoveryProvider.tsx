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
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { SetupScreen } from '@/enums';
import { useMasterWalletContext, useSetup } from '@/hooks';
import { RecoveryService } from '@/service/Recovery';
import { Address } from '@/types';

import { RECOVERY_STEPS } from './constants';
import { getBackupWalletStatus } from './utils';

type RecoverySteps = keyof typeof RECOVERY_STEPS;

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
  /** Callback to proceed to the next step in recovery */
  onNext: () => void;
  /** Callback to go back to the previous step in recovery */
  onPrev: () => void;
}>({
  isLoading: true,
  currentStep: RECOVERY_STEPS.SelectRecoveryMethod,
  isRecoveryAvailable: false,
  hasBackupWallets: false,
  onNext: () => {},
  onPrev: () => {},
});

export const AccountRecoveryProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [currentStep, setCurrentStep] = useState<RecoverySteps>(
    RECOVERY_STEPS.CreateNewPassword,
  );
  const { isOnline } = useContext(OnlineStatusContext);
  const { goto } = useSetup();
  const { masterSafes, isLoading: isMasterWalletLoading } =
    useMasterWalletContext();
  const { data: extendedWallets, isLoading: isExtendedWalletLoading } =
    useQuery({
      queryKey: REACT_QUERY_KEYS.EXTENDED_WALLET_KEY(),
      queryFn: ({ signal }) => RecoveryService.getExtendedWallet(signal),
      enabled: isOnline,
      refetchInterval: FIFTEEN_SECONDS_INTERVAL,
      select: (data) => data[0],
    });

  const isLoading = isMasterWalletLoading || isExtendedWalletLoading;

  const backupWalletDetails = useMemo(() => {
    if (isLoading) return;
    if (!extendedWallets?.safes) return;
    if (!masterSafes) return;
    return getBackupWalletStatus(extendedWallets.safes, masterSafes);
  }, [masterSafes, extendedWallets, isLoading]);

  const onNext = useCallback(() => {
    switch (currentStep) {
      case RECOVERY_STEPS.SelectRecoveryMethod:
        setCurrentStep(RECOVERY_STEPS.CreateNewPassword);
        break;
      case RECOVERY_STEPS.CreateNewPassword:
        setCurrentStep(RECOVERY_STEPS.FundYourBackupWallet);
        break;
      case RECOVERY_STEPS.FundYourBackupWallet:
        setCurrentStep(RECOVERY_STEPS.ApproveWithBackupWallet);
        break;
      case RECOVERY_STEPS.ApproveWithBackupWallet:
        goto(SetupScreen.Welcome);
        break;
      default:
        break;
    }
  }, [currentStep, goto]);

  const onPrev = useCallback(() => {
    switch (currentStep) {
      case RECOVERY_STEPS.CreateNewPassword:
        setCurrentStep(RECOVERY_STEPS.SelectRecoveryMethod);
        break;
      case RECOVERY_STEPS.FundYourBackupWallet:
        setCurrentStep(RECOVERY_STEPS.CreateNewPassword);
        break;
      case RECOVERY_STEPS.ApproveWithBackupWallet:
        setCurrentStep(RECOVERY_STEPS.FundYourBackupWallet);
        break;
      default:
        break;
    }
  }, [currentStep]);

  const isRecoveryAvailable = !!(
    backupWalletDetails?.areAllBackupOwnersSame &&
    backupWalletDetails?.hasBackupWalletsAcrossEveryChain
  );

  const hasBackupWallets =
    !!backupWalletDetails?.hasBackupWalletsAcrossEveryChain;

  return (
    <AccountRecoveryContext.Provider
      value={{
        isLoading,
        isRecoveryAvailable,
        hasBackupWallets,
        backupWalletAddress: isRecoveryAvailable
          ? (backupWalletDetails?.backupAddress as Address)
          : undefined,
        currentStep,
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
