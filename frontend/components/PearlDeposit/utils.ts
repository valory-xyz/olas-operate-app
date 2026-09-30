import { TokenSymbol } from '@/config/tokens';
import { TokenAmounts } from '@/types';
import { AvailableAsset } from '@/types/Wallet';

/**
 * The amounts the user enters are the balances they want the Pearl Wallet to
 * hold. What still has to arrive is each target minus the current balance.
 */
export const getNetDepositAmounts = (
  targets: TokenAmounts,
  assets: AvailableAsset[],
): { symbol: TokenSymbol; amount: number }[] =>
  (Object.entries(targets) as [TokenSymbol, { amount: number }][])
    .map(([symbol, { amount }]) => {
      const balance =
        assets.find((asset) => asset.symbol === symbol)?.amount ?? 0;
      return { symbol, amount: Math.max(0, amount - balance) };
    })
    .filter(({ amount }) => amount > 0);
