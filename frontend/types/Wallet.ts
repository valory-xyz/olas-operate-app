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

/**
 * Response from GET /service/:id/safe_withdrawable_balance.
 * Keyed by middleware chain name, each entry contains token addresses mapped
 * to their withdrawable amount (wei string) and the gas reserve for native.
 */
export type SafeWithdrawableBalanceByChain = {
  withdrawable_amounts: Record<Address, string>;
  gas_reserve: string;
};

export type SafeWithdrawableBalanceResponse = Partial<
  Record<MiddlewareChain, SafeWithdrawableBalanceByChain>
>;

/**
 * Request body for POST /service/:id/withdraw_safe — the `amounts` field.
 * Keyed by middleware chain name → token address → wei string.
 */
export type WithdrawSafeRequestAmounts = Partial<
  Record<MiddlewareChain, Record<Address, string>>
>;
