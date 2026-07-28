import { SETUP_SCREEN, SetupScreen } from '@/constants';
import { BalanceService } from '@/service/Balance';
import { AddressBalanceRecord, BalancesAndFundingRequirements } from '@/types';
import { Address } from '@/types/Address';

/**
 * Returns true if any required token has a non-zero balance in the same
 * wallet. Derived from the freshly fetched funding-requirements response so
 * the routing decision is not subject to stale React state for the previous
 * service config.
 */
const hasWalletContribution = (
  balances: BalancesAndFundingRequirements['balances'],
  totalRequirements: BalancesAndFundingRequirements['total_requirements'],
): boolean =>
  Object.entries(totalRequirements).some(([chain, addrMap]) => {
    const chainBalances = balances?.[chain as keyof typeof balances] as
      | AddressBalanceRecord
      | undefined;
    return Object.entries(addrMap as AddressBalanceRecord).some(
      ([addr, tokenMap]) =>
        Object.entries(tokenMap).some(([tokenAddr, required]) => {
          if (BigInt(required) === 0n) return false;
          const bal =
            chainBalances?.[addr as Address]?.[tokenAddr as Address] ?? '0';
          return BigInt(bal) > 0n;
        }),
    );
  });

/**
 * Determines which funding screen to route to after a service is created /
 * selected (shared by the staking-select flow and the Connect create flow).
 */
export const resolveFundingRoute = async (
  serviceConfigId: string,
): Promise<SetupScreen> => {
  const controller = new AbortController();
  const {
    balances,
    total_requirements,
    is_refill_required,
    allow_start_agent,
  } = await BalanceService.getBalancesAndFundingRequirements({
    serviceConfigId,
    signal: controller.signal,
  });

  if (!is_refill_required && allow_start_agent) {
    return SETUP_SCREEN.ConfirmFunding;
  }

  if (hasWalletContribution(balances, total_requirements)) {
    return SETUP_SCREEN.BalanceCheck;
  }

  return SETUP_SCREEN.FundYourAgent;
};
