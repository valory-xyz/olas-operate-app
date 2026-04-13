export type BackupWalletType = 'web3auth' | 'manual';

export type BackupOwnerStatusChain = {
  safe: string;
  backup_owner: string | null;
  in_sync: boolean;
};

export type BackupOwnerStatus = {
  canonical_backup_owner: string | null;
  all_chains_synced: boolean;
  any_backup_missing: boolean;
  chains: Record<string, BackupOwnerStatusChain>;
  chains_without_safe: string[];
};
