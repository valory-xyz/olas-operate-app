import { TokenSymbol } from '@/constants';

import { Address } from './Address';
import { Nullable } from './Util';

export type SafeCreationResponse = {
  safe: Address;
  message: string;
  create_tx?: string;
};

export type AvailableAsset = {
  address?: string;
  symbol: TokenSymbol;
  amount: number;
};

export type StakedAsset = {
  agentName: Nullable<string>;
  agentImgSrc: Nullable<string>;
  symbol: TokenSymbol;
  amount: number;
  value?: number;
};

/**
 * @example
 * { symbol: 'OLAS', amount: 10 }
 */
export type TokenAmounts = Partial<Record<TokenSymbol, number>>;
