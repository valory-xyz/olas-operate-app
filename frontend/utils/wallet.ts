import { TokenAmounts } from '@/types/Wallet';

import { formatNumber } from './numberFormatters';

/**
 * To format token amounts into a human-readable string.
 * @example: { ETH: 0.5, DAI: 100 } => "0.5 ETH and 100 DAI"
 */
export function tokenBalancesToSentence(tokenAmounts: TokenAmounts): string {
  const entries = Object.entries(tokenAmounts).filter(
    ([, value]) => value !== 0,
  );
  if (entries.length === 0) return '';

  const formatted = entries.map(
    ([symbol, amount]) => `${formatNumber(amount)} ${symbol}`,
  );

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return formatted.join(' and ');
  return `${formatted.slice(0, -1).join(', ')} and ${formatted.at(-1)}`;
}
