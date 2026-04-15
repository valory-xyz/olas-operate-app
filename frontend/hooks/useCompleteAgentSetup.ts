import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TokenSymbol } from '@/config/tokens';
import { useSupportModal } from '@/context/SupportModalProvider';
import { TokenRequirement } from '@/types';
import { WalletBalance } from '@/types/Balance';

import { useGetRefillRequirements } from './useGetRefillRequirements';
import { useMasterBalances } from './useMasterBalances';
import { useMasterSafeCreationAndTransfer } from './useMasterSafeCreationAndTransfer';
import { useServices } from './useServices';
import { useMasterWalletContext } from './useWallet';

export type SetupState =
  | 'detecting' // query in flight; button disabled
  | 'readyToComplete' // Safe deployed + funded
  | 'needsSafeCreation' // EOA funded, Safe pending
  | 'needsFunding'; // insufficient funds anywhere

export type ModalToShow = 'finishing' | 'complete' | 'failed' | null;

export type UseCompleteAgentSetupReturn = {
  setupState: SetupState;
  handleCompleteSetup: () => void;
  modalToShow: ModalToShow;
  shouldNavigateToFundYourAgent: boolean;
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
      walletBalance !== undefined && walletBalance.balance >= requirement.amount
    );
  });
};

export const useCompleteAgentSetup = (): UseCompleteAgentSetupReturn => {
  const { getMasterSafeOf } = useMasterWalletContext();
  const { selectedAgentConfig } = useServices();
  const { totalTokenRequirements, isLoading } = useGetRefillRequirements();
  const { getMasterSafeBalancesOf, getMasterEoaBalancesOf } =
    useMasterBalances();
  const { toggleSupportModal } = useSupportModal();

  const { evmHomeChainId } = selectedAgentConfig;

  const [modalToShow, setModalToShow] = useState<ModalToShow>(null);
  const [shouldNavigateToFundYourAgent, setShouldNavigateToFundYourAgent] =
    useState(false);
  const hasAttemptedCreation = useRef(false);

  const tokenSymbols = useMemo(
    () => totalTokenRequirements.map((r) => r.symbol as TokenSymbol),
    [totalTokenRequirements],
  );

  const {
    mutate: createMasterSafe,
    isSuccess: isSuccessMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
  } = useMasterSafeCreationAndTransfer(tokenSymbols);

  const setupState: SetupState = useMemo(() => {
    if (isLoading) return 'detecting';
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
    getMasterSafeOf,
    getMasterSafeBalancesOf,
    getMasterEoaBalancesOf,
    totalTokenRequirements,
    evmHomeChainId,
  ]);

  // Handle mutation success
  useEffect(() => {
    if (isSuccessMasterSafeCreation) {
      setModalToShow('complete');
    }
  }, [isSuccessMasterSafeCreation]);

  // Handle mutation failure
  useEffect(() => {
    if (isErrorMasterSafeCreation) {
      setModalToShow('failed');
    }
  }, [isErrorMasterSafeCreation]);

  const handleCompleteSetup = useCallback(() => {
    switch (setupState) {
      case 'detecting':
        return; // no-op; button is disabled anyway
      case 'readyToComplete':
        setModalToShow('complete');
        return;
      case 'needsSafeCreation':
        if (hasAttemptedCreation.current) return;
        hasAttemptedCreation.current = true;
        setModalToShow('finishing');
        createMasterSafe();
        return;
      case 'needsFunding':
        setShouldNavigateToFundYourAgent(true);
        return;
    }
  }, [setupState, createMasterSafe]);

  const handleTryAgain = useCallback(() => {
    hasAttemptedCreation.current = false;
    setModalToShow('finishing');
    createMasterSafe();
    hasAttemptedCreation.current = true;
  }, [createMasterSafe]);

  const handleContactSupport = useCallback(() => {
    toggleSupportModal();
  }, [toggleSupportModal]);

  return {
    setupState,
    handleCompleteSetup,
    modalToShow,
    shouldNavigateToFundYourAgent,
    handleTryAgain,
    handleContactSupport,
  };
};
