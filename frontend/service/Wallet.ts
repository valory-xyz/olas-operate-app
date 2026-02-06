import {
  BACKEND_URL,
  CONTENT_TYPE_JSON_UTF8,
  MiddlewareChain,
} from '@/constants';
import { MiddlewareWalletResponse, SafeCreationResponse } from '@/types';
import { parseApiError } from '@/utils';

/**
 * Returns a list of available wallets
 */
const getWallets = async (
  signal: AbortSignal,
): Promise<MiddlewareWalletResponse[]> =>
  fetch(`${BACKEND_URL}/wallet`, {
    signal,
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to fetch wallets');
  });

const createEoa = async () =>
  fetch(`${BACKEND_URL}/wallet`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ ledger_type: 'ethereum' }),
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to create EOA');
  });

/**
 * Creates a new safe (master safe) on the specified chain with an optional backup owner.
 */
const createSafe = async (
  chain: MiddlewareChain,
  backup_owner?: string,
): Promise<SafeCreationResponse> =>
  fetch(`${BACKEND_URL}/wallet/safe`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({
      chain,
      backup_owner,
      transfer_excess_assets: true,
    }),
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to create safe');
  });

const updateSafeBackupOwner = async (
  chain: MiddlewareChain,
  backup_owner: string,
) =>
  fetch(`${BACKEND_URL}/wallet/safe`, {
    method: 'PUT',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ chain, backup_owner }),
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to add backup owner');
  });

/**
 * API call to get recovery seed phrase
 */
const getRecoverySeedPhrase = async (
  password: string,
): Promise<{ mnemonic: string[] }> => {
  const response = await fetch(`${BACKEND_URL}/wallet/mnemonic`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ ledger_type: 'ethereum', password }),
  });

  return response.ok
    ? response.json()
    : parseApiError(response, 'Failed to login');
};

export const WalletService = {
  getWallets,
  createEoa,
  createSafe,
  updateSafeBackupOwner,
  getRecoverySeedPhrase,
};
