import { TokenSymbol } from '@/config/tokens';
import { EvmChainId, MiddlewareChain } from '@/constants';

import { Address } from './Address';
import { Nullable } from './Util';

export type AddressTxnRecord = Record<Address, `0x${string}`>;

export type SafeCreationStatus =
  | 'SAFE_CREATION_FAILED'
  | 'SAFE_CREATED_TRANSFER_FAILED'
  | 'SAFE_EXISTS_TRANSFER_FAILED'
  | 'SAFE_CREATED_TRANSFER_COMPLETED'
  | 'SAFE_EXISTS_ALREADY_FUNDED';

export type SafeCreationResponse = {
  safe: Address;
  create_tx: string;
  transfer_txs: AddressTxnRecord;
  transfer_errors: AddressTxnRecord;
  message: string;
  status: SafeCreationStatus;
};

export type AvailableAsset = {
  address?: string;
  symbol: TokenSymbol;
  amount: number;
  /**
   * String representation of amount to avoid precision issues
   */
  amountInStr?: string;
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
