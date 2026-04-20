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
      throw new Error(errorData.error ?? 'Failed to apply backup owner');
    }
    const data: ApplyBackupOwnerResponse = await res.json();
    if (!data.all_succeeded) {
      const failed = data.results.filter((r) => !r.updated).map((r) => r.chain);
      throw new Error(
        `Backup owner update failed on chains: ${failed.join(', ')}`,
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
      throw new Error(errorData.error ?? 'Failed to sync backup owner');
    }
    const data: SyncBackupOwnerResponse = await res.json();
    if (!data.all_succeeded) {
      const failed = data.results.filter((r) => !r.updated).map((r) => r.chain);
      throw new Error(
        `Backup owner sync failed on chains: ${failed.join(', ')}`,
      );
    }
    return data;
  });

export const BackupWalletService = {
  getBackupOwnerStatus,
  applyBackupOwner,
  syncBackupOwner,
};
