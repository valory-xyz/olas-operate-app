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

const createSafe = async (chain: Chain, owner?: string) =>
  fetch(`${BACKEND_URL}/wallet/safe`, {
    method: 'POST',
    headers: {
      ...CONTENT_TYPE_JSON_UTF8,
    },
    body: JSON.stringify({ chain_type: chain, owner: owner }),
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to create safe');
  });

const addBackupOwner = async (chain: Chain, owner: string) =>
  fetch(`${BACKEND_URL}/wallet/safe`, {
    method: 'PUT',
    headers: {
      ...CONTENT_TYPE_JSON_UTF8,
    },
    body: JSON.stringify({ chain_type: chain, owner: owner }),
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to add backup owner');
  });

export const WalletService = {
  getWallets,
  createEoa,
  createSafe,
  addBackupOwner,
};
