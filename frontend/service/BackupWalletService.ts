import { BACKEND_URL, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import { BackupOwnerStatus } from '@/types/BackupWallet';

export type ApplyBackupOwnerRequest = {
  backup_owner: string;
  password?: string;
};

export type ApplyBackupOwnerResponse = {
  canonical_backup_owner: string;
  results: Record<
    string,
    { updated: boolean; safe: string; error: string | null }
  >;
  all_succeeded: boolean;
};

export type SyncBackupOwnerResponse = {
  canonical_backup_owner: string;
  results: Record<
    string,
    { synced: boolean; safe: string; error: string | null; reason?: string }
  >;
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
  fetch(`${BACKEND_URL}/wallet/safe/backup_owner`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify(request),
  }).then(async (res) => {
    if (res.ok) return res.json();
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error ?? 'Failed to apply backup owner');
  });

const syncBackupOwner = async (): Promise<SyncBackupOwnerResponse> =>
  fetch(`${BACKEND_URL}/wallet/safe/backup_owner/sync`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({}),
  }).then(async (res) => {
    if (res.ok) return res.json();
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error ?? 'Failed to sync backup owner');
  });

export const BackupWalletService = {
  getBackupOwnerStatus,
  applyBackupOwner,
  syncBackupOwner,
};
