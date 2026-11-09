import {
  BACKEND_URL,
  CONTENT_TYPE_JSON_UTF8,
  WEB3AUTH_STATUS_URL,
} from '@/constants';
import {
  BackupOwnerStatus,
  Web3AuthStatusResponse,
} from '@/types/BackupWallet';

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
// SIGNER_PENDING / SIGNER_NEEDS_NEW_BACKUP — onboarding refused to create the
//   Pearl Safe: the backup signer is still being checked (wait and retry), or a
//   new one must be chosen (go to the backup step).
export type BackupWalletErrorCode =
  | 'PARTIAL_FAILURE'
  | 'ALREADY_LINKED'
  | 'NETWORK_ERROR'
  | 'SIGNER_PENDING'
  | 'SIGNER_NEEDS_NEW_BACKUP';

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

/** A stalled pearl-api must turn into an error, which callers treat as disabled. */
export const WEB3AUTH_STATUS_TIMEOUT_MS = 10_000;

const getWeb3AuthStatus = async (
  signal?: AbortSignal,
): Promise<Web3AuthStatusResponse> => {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  const timeout = setTimeout(
    () =>
      controller.abort(
        new Error(
          `Web3Auth status timed out after ${WEB3AUTH_STATUS_TIMEOUT_MS} ms`,
        ),
      ),
    WEB3AUTH_STATUS_TIMEOUT_MS,
  );
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort);
  try {
    const response = await fetch(WEB3AUTH_STATUS_URL, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Failed to fetch Web3Auth status: ${response.status} ${text}`.trim(),
      );
    }
    // Awaited so reading the body stays inside the timeout.
    const body: unknown = await response.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Partial<Web3AuthStatusResponse>).enabled !== 'boolean'
    ) {
      throw new Error(
        `Unexpected Web3Auth status response: ${JSON.stringify(body)}`,
      );
    }
    return body as Web3AuthStatusResponse;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
};

export const BackupWalletService = {
  getBackupOwnerStatus,
  getWeb3AuthStatus,
  applyBackupOwner,
  syncBackupOwner,
};
