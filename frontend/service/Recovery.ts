import { BACKEND_URL, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import {
  ExtendedWallet,
  RecoveryFundingRequirements,
  RecoveryPrepareProcess,
  RecoveryStatus,
} from '@/types/Recovery';

/**
 * Fetches the recovery status of wallets, ie if the swap is in progress or completed.
 */
const getRecoveryStatus = async (
  signal?: AbortSignal,
): Promise<RecoveryStatus> =>
  fetch(`${BACKEND_URL}/wallet/recovery/status`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to fetch recovery status');
  });

/**
 * Extended wallet information including safes and additional metadata.
 */
const getExtendedWallet = async (
  signal?: AbortSignal,
): Promise<ExtendedWallet[]> =>
  fetch(`${BACKEND_URL}/wallet/extended`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to fetch extended wallet');
  });

/**
 * Fetches the recovery funding requirements for each chain.
 */
const getRecoveryFundingRequirements = async (
  signal?: AbortSignal,
): Promise<RecoveryFundingRequirements> =>
  fetch(`${BACKEND_URL}/wallet/recovery/funding_requirements`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to fetch recovery funding requirements');
  });

/**
 * Prepares the recovery process by setting a new password.
 */
const prepareRecovery = async (
  newPassword: string,
  signal?: AbortSignal,
): Promise<RecoveryPrepareProcess> =>
  fetch(`${BACKEND_URL}/wallet/recovery/prepare`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ new_password: newPassword }),
    signal,
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to prepare recovery');
  });

/**
 * Completes the recovery process.
 */
const completeRecovery = async (
  signal?: AbortSignal,
): Promise<{ success: boolean }> =>
  fetch(`${BACKEND_URL}/wallet/recovery/complete`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to complete recovery');
  });

export const RecoveryService = {
  getRecoveryStatus,
  getExtendedWallet,
  getRecoveryFundingRequirements,
  prepareRecovery,
  completeRecovery,
};
