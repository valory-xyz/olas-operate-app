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

// ============================================================================
// DEV MOCK — set to false before committing / creating PR
// ============================================================================
const USE_MOCK = true;

/**
 * Change this to test different UI states:
 *
 * STATE A (no backup wallet):
 *   canonical_backup_owner: null, any_backup_missing: true, all_chains_synced: true
 *
 * STATE B (backup set, in sync):
 *   canonical_backup_owner: '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
 *   any_backup_missing: false, all_chains_synced: true
 *
 * STATE C (backup set, out of sync):
 *   canonical_backup_owner: '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
 *   any_backup_missing: true, all_chains_synced: false
 */
const MOCK_STATUS: BackupOwnerStatus = {
  canonical_backup_owner: null,
  all_chains_synced: true,
  any_backup_missing: true,
  chains: [],
  chains_without_safe: [],
};

/** Simulate network delay (ms) */
const MOCK_DELAY = 2000;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const mockGetBackupOwnerStatus = async (): Promise<BackupOwnerStatus> => {
  return MOCK_STATUS;
};

const mockApplyBackupOwner = async (
  request: ApplyBackupOwnerRequest,
): Promise<ApplyBackupOwnerResponse> => {
  await delay(MOCK_DELAY);

  if (
    MOCK_STATUS.canonical_backup_owner &&
    request.backup_owner.toLowerCase() ===
      MOCK_STATUS.canonical_backup_owner.toLowerCase()
  ) {
    throw new Error('Wallet Already Linked');
  }

  MOCK_STATUS.canonical_backup_owner = request.backup_owner;
  MOCK_STATUS.any_backup_missing = false;
  MOCK_STATUS.all_chains_synced = true;

  return {
    canonical_backup_owner: request.backup_owner,
    results: [
      { chain: 'gnosis', updated: true, message: 'Backup owner updated' },
      { chain: 'ethereum', updated: true, message: 'Backup owner updated' },
    ],
    all_succeeded: true,
  };
};

const mockSyncBackupOwner = async (): Promise<SyncBackupOwnerResponse> => {
  await delay(MOCK_DELAY);

  if (!MOCK_STATUS.canonical_backup_owner) {
    throw new Error('No canonical backup owner is set.');
  }

  MOCK_STATUS.all_chains_synced = true;
  MOCK_STATUS.any_backup_missing = false;

  return {
    canonical_backup_owner: MOCK_STATUS.canonical_backup_owner,
    results: [
      { chain: 'gnosis', updated: true, message: 'Synced' },
      { chain: 'ethereum', updated: true, message: 'Synced' },
    ],
    all_succeeded: true,
  };
};

// ============================================================================
// Real API calls
// ============================================================================

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
  getBackupOwnerStatus: USE_MOCK
    ? mockGetBackupOwnerStatus
    : getBackupOwnerStatus,
  applyBackupOwner: USE_MOCK ? mockApplyBackupOwner : applyBackupOwner,
  syncBackupOwner: USE_MOCK ? mockSyncBackupOwner : syncBackupOwner,
};
