import { useEffect } from 'react';

import { SETUP_SCREEN, SetupScreen } from '@/constants';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useSetup } from '@/hooks/useSetup';

const ELIGIBLE_SCREENS: SetupScreen[] = [
  SETUP_SCREEN.BalanceCheck,
  SETUP_SCREEN.FundYourAgent,
];

/**
 * Watches the funding requirements context and automatically advances to
 * ConfirmFunding when the current screen is BalanceCheck or FundYourAgent
 * and the agent is already fully funded (no refill required, agent can start).
 *
 * This handles the case where balances satisfy requirements before or during
 * the funding flow, preventing the screen from freezing in a loading state.
 */
export const useAutoAdvanceWhenFunded = (currentScreen: SetupScreen) => {
  const { goto } = useSetup();
  const {
    isBalancesAndFundingRequirementsLoading,
    isRefillRequired,
    canStartAgent,
  } = useBalanceAndRefillRequirementsContext();

  useEffect(() => {
    if (!ELIGIBLE_SCREENS.includes(currentScreen)) return;
    if (isBalancesAndFundingRequirementsLoading) return;
    if (isRefillRequired) return;
    if (!canStartAgent) return;

    goto(SETUP_SCREEN.ConfirmFunding);
  }, [
    currentScreen,
    isBalancesAndFundingRequirementsLoading,
    isRefillRequired,
    canStartAgent,
    goto,
  ]);
};
