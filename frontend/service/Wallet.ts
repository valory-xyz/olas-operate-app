import { MiddlewareChain, MiddlewareWalletResponse } from '@/client';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL } from '@/constants/urls';
import { Address } from '@/types/Address';
import { SafeCreationResponse } from '@/types/Wallet';

const IS_MOCK_ENABLED = true;

const createSafeMock = {
  safe: '0x29e23F7705d849F368855947691cB133CD770752',
  message: 'Safe created!',
} as const satisfies SafeCreationResponse;

/**
 * Returns a list of available wallets
 */
const getWallets = async (signal: AbortSignal) =>
  fetch(`${BACKEND_URL}/wallet`, {
    signal,
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to fetch wallets');
  }) as Promise<MiddlewareWalletResponse[]>;

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
 *
 * @param initial_funds Funds to be sent to master safe from master EOA
 */
const createSafe = async (
  chain: MiddlewareChain,
  backup_owner?: string,
  initial_funds?: { [address: Address]: bigint | number },
): Promise<SafeCreationResponse> =>
  IS_MOCK_ENABLED
    ? Promise.resolve(createSafeMock)
    : fetch(`${BACKEND_URL}/wallet/safe`, {
        method: 'POST',
        headers: { ...CONTENT_TYPE_JSON_UTF8 },
        body: JSON.stringify({ chain, backup_owner, initial_funds }),
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

export const WalletService = {
  getWallets,
  createEoa,
  createSafe,
  updateSafeBackupOwner,
};
