export type BackupWalletType = 'web3auth' | 'manual';

export type BackupOwnerStatusChain = {
  chain: string;
  safe: string;
  current_backup_owner: string | null;
  synced: boolean;
};

export type BackupOwnerStatus = {
  canonical_backup_owner: string | null;
  all_chains_synced: boolean;
  any_backup_missing: boolean;
  chains: BackupOwnerStatusChain[];
  chains_without_safe: string[];
};
