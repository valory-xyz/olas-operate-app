import { BACKEND_URL, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import { ExtendedWallet, RecoveryStatus } from '@/types/Recovery';

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
  fetch(`${BACKEND_URL}/extended/wallet`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to fetch extended wallet');
  });

export const RecoveryService = {
  getRecoveryStatus,
  getExtendedWallet,
};
