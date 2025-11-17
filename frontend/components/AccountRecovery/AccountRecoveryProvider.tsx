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

import { getBackupWalletStatus } from './utils';

const RECOVERY_STEPS = {
  SelectRecoveryMethod: 'SelectRecoveryMethod',
  CreateNewPassword: 'CreateNewPassword',
  FundYourBackupWallet: 'FundYourBackupWallet',
  ApproveWithBackupWallet: 'ApproveWithBackupWallet',
} as const;

type RecoverySteps = keyof typeof RECOVERY_STEPS;

const AccountRecoveryContext = createContext<{
  isLoading: boolean;
  /** Indicates if account recovery is available based on backup wallet */
  isRecoveryAvailable: boolean;
  /** Indicates if there are backup wallets across every chain */
  hasBackupWallets: boolean;
  /** Current step in the account recovery flow */
  currentStep: RecoverySteps;
  /** Callback to proceed to the next step in recovery */
  onNext: () => void;
}>({
  isLoading: true,
  currentStep: RECOVERY_STEPS.SelectRecoveryMethod,
  isRecoveryAvailable: false,
  hasBackupWallets: false,
  onNext: () => {},
});

export const AccountRecoveryProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [currentStep, setCurrentStep] = useState<RecoverySteps>(
    RECOVERY_STEPS.SelectRecoveryMethod,
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
  // console.log({ data, isLoading });

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

  const isRecoveryAvailable =
    backupWalletDetails?.areAllBackupOwnersSame &&
    backupWalletDetails?.hasBackupWalletsAcrossEveryChain;

  return (
    <AccountRecoveryContext.Provider
      value={{
        isLoading,
        isRecoveryAvailable: !!isRecoveryAvailable,
        hasBackupWallets:
          !!backupWalletDetails?.hasBackupWalletsAcrossEveryChain,
        currentStep,
        onNext,
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
