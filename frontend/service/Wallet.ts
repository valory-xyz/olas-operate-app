import { Chain } from '@/client';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL } from '@/constants/urls';

/**
 * Returns a list of available wallets
 */
const getWallets = async () =>
  fetch(`${BACKEND_URL}/wallet`).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to get wallets');
  });

const createEoa = async (chain: Chain) =>
  fetch(`${BACKEND_URL}/wallet`, {
    method: 'POST',
    headers: {
      ...CONTENT_TYPE_JSON_UTF8,
    },
    body: JSON.stringify({ chain_type: chain }),
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to create EOA');
  });

const createSafe = async (chain: Chain, backupOwner?: string) =>
  fetch(`${BACKEND_URL}/wallet/safe`, {
    method: 'POST',
    headers: {
      ...CONTENT_TYPE_JSON_UTF8,
    },
    body: JSON.stringify({ chain_type: chain, backup_owner: backupOwner }),
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to create safe');
  });

const updateSafeBackupOwner = async (chain: Chain, backupOwner: string) =>
  fetch(`${BACKEND_URL}/wallet/safe`, {
    method: 'PUT',
    headers: {
      ...CONTENT_TYPE_JSON_UTF8,
    },
    body: JSON.stringify({ chain_type: chain, backup_owner: backupOwner }),
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to update safe backup owner');
  });

export const WalletService = {
  getWallets,
  createEoa,
  createSafe,
  updateSafeBackupOwner,
};
