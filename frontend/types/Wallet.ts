import { TokenSymbol } from '@/constants';

import { Address } from './Address';
import { AddressTxnRecord } from './Records';
import { Nullable } from './Util';

export type SafeCreationResponse = {
  safe: Address;
  message: string;
  create_tx: string;
  transfer_txs: AddressTxnRecord;
};

export type AvailableAsset = {
  address?: string;
  symbol: TokenSymbol;
  /** @deprecated Use `amountString` instead for accurate representation */
  amount: number;
  amountString?: string;
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
