import { TokenSymbol } from '@/config/tokens';
import { TokenAmounts } from '@/types';

export const getEnteredDepositAmounts = (
  amounts: TokenAmounts,
): { symbol: TokenSymbol; amount: number }[] =>
  (Object.entries(amounts) as [TokenSymbol, { amount: number }][])
    .map(([symbol, { amount }]) => ({ symbol, amount }))
    .filter(({ amount }) => amount > 0);
