import { isNil } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { TokenSymbol } from '@/config/tokens';
import { PAGES, SETUP_SCREEN } from '@/constants';
import { useSupportModal } from '@/context/SupportModalProvider';
import { TokenRequirement } from '@/types';
import { WalletBalance } from '@/types/Balance';
import { delayInSeconds } from '@/utils';

import { useGetRefillRequirements } from './useGetRefillRequirements';
import { useMasterBalances } from './useMasterBalances';
import { useMasterSafeCreationAndTransfer } from './useMasterSafeCreationAndTransfer';
import { usePageState } from './usePageState';
import { useServices } from './useServices';
import { useSetup } from './useSetup';
import { useMasterWalletContext } from './useWallet';

export type SetupState =
  | 'detecting' // query in flight; button disabled
  | 'readyToComplete' // Safe deployed + funded
  | 'needsSafeCreation' // EOA funded, Safe pending
  | 'needsFunding'; // insufficient funds anywhere

export type ModalToShow =
  | 'creatingSafe'
  | 'setupComplete'
  | 'safeCreationFailed'
  | null;

export type UseCompleteAgentSetupReturn = {
  setupState: SetupState;
  handleCompleteSetup: () => void;
  modalToShow: ModalToShow;
  dismissModal: () => void;
  handleTryAgain: () => void;
  handleContactSupport: () => void;
};

/**
 * Returns `true` if all requirements are satisfied by the provided balances.
 * Returns `false` if requirements is empty (no requirements means nothing is satisfied).
 */
const allRequirementsMet = (
  balances: WalletBalance[],
  requirements: TokenRequirement[],
): boolean => {
  if (requirements.length === 0) return false;
  return requirements.every((requirement) => {
    const walletBalance = balances.find(
      (balance) => balance.symbol === requirement.symbol,
    );
    return (
      walletBalance !== undefined &&
      Number(walletBalance.balanceString ?? '0') >= requirement.amount
    );
  });
};

export const useCompleteAgentSetup = (): UseCompleteAgentSetupReturn => {
  const { getMasterSafeOf, isFetched: isMasterWalletFetched } =
    useMasterWalletContext();
  const { selectedAgentConfig } = useServices();
  const { totalTokenRequirements, isLoading } = useGetRefillRequirements();
  const {
    getMasterSafeBalancesOf,
    getMasterEoaBalancesOf,
    isLoaded: isBalancesLoaded,
  } = useMasterBalances();
  const { toggleSupportModal } = useSupportModal();
  const { goto } = usePageState();
  const { goto: gotoSetup } = useSetup();

  const { evmHomeChainId } = selectedAgentConfig;

  const [modalToShow, setModalToShow] = useState<ModalToShow>(null);

  const tokenSymbols = useMemo(
    () => totalTokenRequirements.map((r) => r.symbol as TokenSymbol),
    [totalTokenRequirements],
  );

  const {
    mutate: createMasterSafe,
    isPending: isLoadingMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
    data: creationAndTransferDetails,
  } = useMasterSafeCreationAndTransfer(tokenSymbols);

  const setupState: SetupState = useMemo(() => {
    if (isLoading || !isBalancesLoaded) return 'detecting';
    const masterSafe = getMasterSafeOf?.(evmHomeChainId);
    if (masterSafe) {
      const safeBalances = getMasterSafeBalancesOf(evmHomeChainId);
      if (allRequirementsMet(safeBalances, totalTokenRequirements))
        return 'readyToComplete';
    } else {
      const eoaBalances = getMasterEoaBalancesOf(evmHomeChainId);
      if (allRequirementsMet(eoaBalances, totalTokenRequirements))
        return 'needsSafeCreation';
    }
    return 'needsFunding';
  }, [
    isLoading,
    isBalancesLoaded,
    getMasterSafeOf,
    getMasterSafeBalancesOf,
    getMasterEoaBalancesOf,
    totalTokenRequirements,
    evmHomeChainId,
  ]);

  const isSafeCreated = isMasterWalletFetched
    ? !isNil(getMasterSafeOf?.(evmHomeChainId)) ||
      creationAndTransferDetails?.safeCreationDetails?.isSafeCreated
    : false;

  const isTransferComplete =
    creationAndTransferDetails?.transferDetails?.isTransferComplete;

  const hasSafeCreationFailure =
    isErrorMasterSafeCreation ||
    creationAndTransferDetails?.safeCreationDetails?.status === 'error';

  const hasTransferFailure = Boolean(
    creationAndTransferDetails?.safeCreationDetails?.isSafeCreated &&
      !creationAndTransferDetails?.transferDetails?.isTransferComplete &&
      creationAndTransferDetails?.transferDetails?.transfers?.some(
        (t) => t.status === 'error',
      ),
  );

  const shouldShowFailureModal = hasSafeCreationFailure || hasTransferFailure;

  // Handle backend-reported or network-level failures
  useEffect(() => {
    if (!shouldShowFailureModal) return;
    setModalToShow('safeCreationFailed');
  }, [shouldShowFailureModal]);

  // Show setup complete modal once safe is created and transfer is done
  useEffect(() => {
    if (isLoadingMasterSafeCreation) return;
    if (isErrorMasterSafeCreation) return;
    if (!isSafeCreated) return;
    if (!isTransferComplete) return;

    delayInSeconds(0.25).then(() => setModalToShow('setupComplete'));
  }, [
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
    isSafeCreated,
    isTransferComplete,
  ]);

  const handleCompleteSetup = useCallback(() => {
    switch (setupState) {
      case 'detecting':
        return; // no-op; button is disabled anyway
      case 'readyToComplete':
        setModalToShow('setupComplete');
        return;
      case 'needsSafeCreation':
        if (isLoadingMasterSafeCreation) return;
        setModalToShow('creatingSafe');
        createMasterSafe();
        return;
      case 'needsFunding':
        gotoSetup(SETUP_SCREEN.FundYourAgent);
        goto(PAGES.Setup);
        return;
    }
  }, [
    setupState,
    createMasterSafe,
    isLoadingMasterSafeCreation,
    goto,
    gotoSetup,
  ]);

  const handleTryAgain = useCallback(() => {
    setModalToShow('creatingSafe');
    createMasterSafe();
  }, [createMasterSafe]);

  const dismissModal = useCallback(() => {
    setModalToShow(null);
  }, []);

  const handleContactSupport = useCallback(() => {
    toggleSupportModal();
  }, [toggleSupportModal]);

  return {
    setupState,
    handleCompleteSetup,
    modalToShow,
    dismissModal,
    handleTryAgain,
    handleContactSupport,
  };
};
