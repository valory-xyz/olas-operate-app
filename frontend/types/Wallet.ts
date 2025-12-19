import { TokenSymbol } from '@/config/tokens';
import { EvmChainId, MiddlewareChain } from '@/constants';

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
  configId: string;
  chainId: EvmChainId;
};

export type TokenAmountDetails = {
  amount: number;
  withdrawAll?: boolean;
};

/**
 * @example
 * { symbol: 'OLAS', amount: 10 }
 */
export type TokenAmounts = Partial<Record<TokenSymbol, TokenAmountDetails>>;

export type TokenRequirement = {
  amount: number;
  symbol: string;
  iconSrc: string;
};

enum MiddlewareLedger {
  ETHEREUM = 0,
  SOLANA = 1,
}

export type MiddlewareWalletResponse = {
  address: Address;
  safe_chains: MiddlewareChain[];
  ledger_type: MiddlewareLedger;
  safes: {
    [middlewareChainId in MiddlewareChain]: Address;
  };
  safe_nonce: number;
};
