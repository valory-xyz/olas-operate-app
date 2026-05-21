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
import { useMasterWalletContext, useSetup, useStore } from '@/hooks';
import { RecoveryService } from '@/service/Recovery';
import { Address } from '@/types';
import { SwapSafeTransaction } from '@/types/Recovery';

import { TokenRequirementsRow } from '../ui';
import {
  RECOVERY_STEPS,
  RecoverySteps,
  RESET_METHOD,
  ResetMethod,
} from './constants';
import {
  getBackupWalletStatus,
  parseRecoveryFundingRequirements,
} from './utils';

const useRecoveryNavigation = (
  currentStep: RecoverySteps,
  updateCurrentStep: (state: RecoverySteps) => void,
  clearSelectedResetMethod: () => void,
) => {
  const { goto } = useSetup();

  const onNext = useCallback(() => {
    switch (currentStep) {
      case RECOVERY_STEPS.SelectRecoveryMethod:
        updateCurrentStep(RECOVERY_STEPS.SelectPasswordResetOption);
        break;
      // SelectPasswordResetOption uses selectResetMethodAndProceed instead
      // of onNext to avoid stale-closure reads of selectedResetMethod.
      // Backup-wallet path
      case RECOVERY_STEPS.CreateNewPassword:
        updateCurrentStep(RECOVERY_STEPS.FundYourBackupWallet);
        break;
      case RECOVERY_STEPS.FundYourBackupWallet:
        updateCurrentStep(RECOVERY_STEPS.ApproveWithBackupWallet);
        break;
      case RECOVERY_STEPS.ApproveWithBackupWallet:
        goto(SETUP_SCREEN.Welcome);
        break;
      // SRP path
      case RECOVERY_STEPS.EnterSecretRecoveryPhrase:
        updateCurrentStep(RECOVERY_STEPS.SetNewPasswordViaSRP);
        break;
      case RECOVERY_STEPS.SetNewPasswordViaSRP:
        goto(SETUP_SCREEN.Welcome);
        break;
      default:
        break;
    }
  }, [updateCurrentStep, goto, currentStep]);

  const onPrev = useCallback(() => {
    switch (currentStep) {
      case RECOVERY_STEPS.SelectPasswordResetOption:
        clearSelectedResetMethod();
        updateCurrentStep(RECOVERY_STEPS.SelectRecoveryMethod);
        break;
      // Backup-wallet path
      case RECOVERY_STEPS.CreateNewPassword:
        updateCurrentStep(RECOVERY_STEPS.SelectPasswordResetOption);
        break;
      case RECOVERY_STEPS.FundYourBackupWallet:
        updateCurrentStep(RECOVERY_STEPS.CreateNewPassword);
        break;
      case RECOVERY_STEPS.ApproveWithBackupWallet:
        updateCurrentStep(RECOVERY_STEPS.FundYourBackupWallet);
        break;
      // SRP path
      case RECOVERY_STEPS.EnterSecretRecoveryPhrase:
        clearSelectedResetMethod();
        updateCurrentStep(RECOVERY_STEPS.SelectPasswordResetOption);
        break;
      case RECOVERY_STEPS.SetNewPasswordViaSRP:
        updateCurrentStep(RECOVERY_STEPS.EnterSecretRecoveryPhrase);
        break;
      default:
        break;
    }
  }, [currentStep, updateCurrentStep, clearSelectedResetMethod]);

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

  // Reset method selection (backup-wallet vs SRP)
  selectedResetMethod?: ResetMethod;
  setSelectedResetMethod: (method: ResetMethod) => void;
  /**
   * Atomic action used by the picker screen: sets the chosen method and
   * navigates to the corresponding next step in the same React tick to avoid
   * stale-closure reads of selectedResetMethod inside onNext.
   */
  selectResetMethodAndProceed: (method: ResetMethod) => void;

  // SRP path state
  /** The 12-word mnemonic entered by the user (lives only in memory) */
  srpMnemonic?: string;
  setSrpMnemonic: (mnemonic: string | undefined) => void;
  /** Error message from SRP validation (e.g. invalid mnemonic) */
  srpError?: string;
  setSrpError: (error: string | undefined) => void;

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
  setSelectedResetMethod: () => {},
  selectResetMethodAndProceed: () => {},
  setSrpMnemonic: () => {},
  setSrpError: () => {},
  onNext: () => {},
  onPrev: () => {},
});

export const AccountRecoveryProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { isOnline } = useOnlineStatus();
  const { storeState } = useStore();
  const { masterSafes, isLoading: isMasterWalletLoading } =
    useMasterWalletContext();

  // Recovery uses Web3Auth re-login to swap the safe owner. Manual EOA backups
  // can't take this path — those users have to swap the owner themselves with
  // their EOA's private key (RecoverExistingAccountCard covers that flow).
  const isWeb3AuthBackup =
    storeState?.lastProvidedBackupWallet?.type === 'web3auth';

  const [currentStep, setCurrentStep] = useState<RecoverySteps>(
    RECOVERY_STEPS.SelectRecoveryMethod,
  );
  const [selectedResetMethod, setSelectedResetMethod] = useState<
    ResetMethod | undefined
  >();
  const [newMasterEoaAddress, setNewMasterEoaAddress] = useState<Address>();
  const [oldMasterEoaAddress, setOldMasterEoaAddress] = useState<Address>();
  const [srpMnemonic, setSrpMnemonic] = useState<string | undefined>();
  const [srpError, setSrpError] = useState<string | undefined>();
  const clearSelectedResetMethod = useCallback(
    () => setSelectedResetMethod(undefined),
    [],
  );
  const selectResetMethodAndProceed = useCallback((method: ResetMethod) => {
    setSelectedResetMethod(method);
    setCurrentStep(
      method === RESET_METHOD.SRP
        ? RECOVERY_STEPS.EnterSecretRecoveryPhrase
        : RECOVERY_STEPS.CreateNewPassword,
    );
  }, []);
  const { onNext, onPrev } = useRecoveryNavigation(
    currentStep,
    useCallback((step: RecoverySteps) => setCurrentStep(step), []),
    clearSelectedResetMethod,
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
    isWeb3AuthBackup &&
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
        selectedResetMethod,
        selectResetMethodAndProceed,
        setSelectedResetMethod,
        srpMnemonic,
        setSrpMnemonic,
        srpError,
        setSrpError,
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
