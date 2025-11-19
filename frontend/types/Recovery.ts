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

export type TokenBalance = Record<Address, number>;

export type BackupOwnerSafe = {
  backup_owners: Address[];
  balances: TokenBalance;
};

export type SafeChainData = {
  [safeAddress: Address]: BackupOwnerSafe;
};

export type ExtendedWallet = {
  address: string;
  safes: Record<SupportedMiddlewareChain, SafeChainData>;
  safe_chains: SupportedMiddlewareChain[];
  ledger_type: string;
  safe_nonce: string | number;
  balances: Record<SupportedMiddlewareChain, Record<Address, TokenBalance>>;
  extended_json: boolean;
  consistent_safe_address: boolean;
  consistent_backup_owner: boolean;
  consistent_backup_owner_count: boolean;
};
