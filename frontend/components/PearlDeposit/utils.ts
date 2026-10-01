import { TokenSymbol } from '@/config/tokens';
import { TokenAmountDetails, TokenAmounts } from '@/types';
import { AvailableAsset } from '@/types/Wallet';

const getBalanceOf = (symbol: TokenSymbol, assets: AvailableAsset[]) =>
  assets.find((asset) => asset.symbol === symbol)?.amount ?? 0;

/**
 * The amounts the user enters are the balances they want the Pearl Wallet to
 * hold. What still has to arrive is each target minus the current balance.
 */
export const getNetDepositAmounts = (
  targets: TokenAmounts,
  assets: AvailableAsset[],
): { symbol: TokenSymbol; amount: number }[] =>
  (Object.entries(targets) as [TokenSymbol, { amount: number }][])
    .map(([symbol, { amount }]) => ({
      symbol,
      amount: Math.max(0, amount - getBalanceOf(symbol, assets)),
    }))
    .filter(({ amount }) => amount > 0);

/**
 * Turns amounts still to add (e.g. a refill shortfall) into the target
 * balances the deposit fields hold, so `getNetDepositAmounts` gives the
 * shortfall back. A token with nothing to add stays at 0.
 */
export const toTargetBalances = (
  amountsToAdd: TokenAmounts,
  assets: AvailableAsset[],
): TokenAmounts =>
  Object.fromEntries(
    (Object.entries(amountsToAdd) as [TokenSymbol, TokenAmountDetails][]).map(
      ([symbol, details]) => [
        symbol,
        {
          ...details,
          amount:
            details.amount > 0
              ? details.amount + getBalanceOf(symbol, assets)
              : 0,
        },
      ],
    ),
  );
