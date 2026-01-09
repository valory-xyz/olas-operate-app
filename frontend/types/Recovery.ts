import { SupportedMiddlewareChain } from '@/constants';

import { Address } from './Address';

export type RecoveryStatus = {
  prepared: boolean;
  bundle_id: string;
  /**
   * This means there is a recovery bundle with swaps.
   * The user must finish completing the process and login to application should be blocked until completed
   * */
  has_swaps: boolean;
  has_pending_swaps: boolean;
};

type TokenBalance = Record<Address, string>;

type BackupOwnerSafe = {
  backup_owners: Address[];
  balances: TokenBalance;
};

type SafeChainData = {
  [safeAddress: Address]: BackupOwnerSafe;
};

export type ExtendedWallet = {
  address: string;
  safes: Record<SupportedMiddlewareChain, SafeChainData>;
  /** List of chains where the wallet has safes */
  safe_chains: SupportedMiddlewareChain[];
  ledger_type: string;
  safe_nonce: string | number;
  balances: Record<SupportedMiddlewareChain, Record<Address, TokenBalance>>;
  extended_json: boolean;
  consistent_safe_address: boolean;
  consistent_backup_owner: boolean;
  consistent_backup_owner_count: boolean;
};

type RecoveryWallet = {
  address: Address;
  safes: Record<SupportedMiddlewareChain, Address>;
  safe_chains: SupportedMiddlewareChain[];
  ledger_type: 'ethereum';
  safe_nonce: number;
};

export type RecoveryPrepareProcess = {
  /** bundle id */
  id: string;
  wallets: {
    // old master EOA
    current_wallet: RecoveryWallet;
    // new master EOA
    new_wallet: RecoveryWallet;
    new_mnemonic: string[];
  }[];
};

/** tokenAddress → amount */
type TokenBalanceMap = Record<Address, string>;

/**
 * @example
 * {
 *   "gnosis": {
 *     "0xSafeAddress": { "0xTokenAddress": '123' }
 *   }
 * }
 */
export type ChainAddressTokenBalances = Record<
  SupportedMiddlewareChain,
  Record<Address, TokenBalanceMap>
>;

export type RecoveryFundingRequirements = {
  balances: ChainAddressTokenBalances;
  total_requirements: ChainAddressTokenBalances;
  refill_requirements: ChainAddressTokenBalances;
  is_refill_required: boolean;
  pending_backup_owner_swaps: Record<SupportedMiddlewareChain, Address[]>;
};

export type SwapOwnerTransactionSuccess = {
  success: true;
  txHash: string;
  chainId: number;
  safeAddress: string;
};

export type SwapOwnerTransactionFailure = {
  success: false;
  error: string;
  chainId: number;
  safeAddress: string;
};

export type SwapOwnerParams = {
  safeAddress: Address;
  oldOwnerAddress: Address;
  newOwnerAddress: Address;
  backupOwnerAddress: Address;
  chainId: number;
};

export type SwapSafeTransaction = {
  chain: SupportedMiddlewareChain;
  signerAddress: Address;
  safeAddress: Address;
  oldMasterEoaAddress: Address;
  newMasterEoaAddress: Address;
  status?: 'completed' | 'pending' | 'failed';
};
