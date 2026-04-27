import { BACKEND_URL, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import { BackupOwnerStatus } from '@/types/BackupWallet';

export type ApplyBackupOwnerRequest = {
  backup_owner: string;
  password?: string;
};

type ApplyBackupOwnerResult = {
  chain: string;
  updated: boolean;
  message: string;
};

export type ApplyBackupOwnerResponse = {
  canonical_backup_owner: string;
  results: ApplyBackupOwnerResult[];
  all_succeeded: boolean;
};

type SyncBackupOwnerResult = {
  chain: string;
  updated: boolean;
  message: string;
};

export type SyncBackupOwnerResponse = {
  canonical_backup_owner: string;
  results: SyncBackupOwnerResult[];
  all_succeeded: boolean;
};

// PARTIAL_FAILURE  — HTTP 200 with all_succeeded:false. Backend has stored
//   canonical_backup_owner; some chains are out of sync. Recovery: call sync.
// ALREADY_LINKED   — HTTP 400 "Wallet Already Linked". Canonical matches the
//   requested address from a prior call. Same recovery: call sync (it means
//   canonical is stored but chains may still be out of sync).
// NETWORK_ERROR    — HTTP 5xx / fetch rejection / any other 4xx. Canonical
//   was NOT stored. Recovery: retry apply.
export type BackupWalletErrorCode =
  | 'PARTIAL_FAILURE'
  | 'ALREADY_LINKED'
  | 'NETWORK_ERROR';

export class BackupWalletError extends Error {
  constructor(
    message: string,
    public readonly code: BackupWalletErrorCode,
    public readonly failedChains?: string[],
  ) {
    super(message);
    this.name = 'BackupWalletError';
  }
}

const ALREADY_LINKED_MESSAGE = 'Wallet Already Linked';

const getBackupOwnerStatus = async (): Promise<BackupOwnerStatus> =>
  fetch(`${BACKEND_URL}/wallet/safe/backup_owner/status`).then(async (res) => {
    if (res.ok) return res.json();
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error ?? 'Failed to fetch backup owner status');
  });

const applyBackupOwner = async (
  request: ApplyBackupOwnerRequest,
): Promise<ApplyBackupOwnerResponse> =>
  fetch(`${BACKEND_URL}/wallet/safe`, {
    method: 'PUT',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({
      chain: 'all',
      backup_owner: request.backup_owner,
      ...(request.password ? { password: request.password } : {}),
    }),
  }).then(async (res) => {
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.error ?? 'Failed to apply backup owner';
      if (message === ALREADY_LINKED_MESSAGE) {
        throw new BackupWalletError(message, 'ALREADY_LINKED');
      }
      throw new BackupWalletError(message, 'NETWORK_ERROR');
    }
    const data: ApplyBackupOwnerResponse = await res.json();
    if (!data.all_succeeded) {
      const failedChains = data.results
        .filter((r) => !r.updated)
        .map((r) => r.chain);
      throw new BackupWalletError(
        `Backup owner update failed on chains: ${failedChains.join(', ')}`,
        'PARTIAL_FAILURE',
        failedChains,
      );
    }
    return data;
  });

const syncBackupOwner = async (): Promise<SyncBackupOwnerResponse> =>
  fetch(`${BACKEND_URL}/wallet/safe/backup_owner/sync`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({}),
  }).then(async (res) => {
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new BackupWalletError(
        errorData.error ?? 'Failed to sync backup owner',
        'NETWORK_ERROR',
      );
    }
    const data: SyncBackupOwnerResponse = await res.json();
    if (!data.all_succeeded) {
      const failedChains = data.results
        .filter((r) => !r.updated)
        .map((r) => r.chain);
      throw new BackupWalletError(
        `Backup owner sync failed on chains: ${failedChains.join(', ')}`,
        'PARTIAL_FAILURE',
        failedChains,
      );
    }
    return data;
  });

export const BackupWalletService = {
  getBackupOwnerStatus,
  applyBackupOwner,
  syncBackupOwner,
};
