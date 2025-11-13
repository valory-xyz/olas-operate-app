import { BACKEND_URL, CONTENT_TYPE_JSON_UTF8 } from '@/constants';

type WalletDetails = {
  id: string;
  ledger_type: string;
  address: string;
  created_at: string;
};

/**
 * Extended wallet information including safes and additional metadata.
 */
const getExtendedWallet = async (
  signal?: AbortSignal,
): Promise<WalletDetails> =>
  fetch(`${BACKEND_URL}/extended/wallet`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to fetch extended wallet');
  });

export const RecoveryService = {
  getExtendedWallet,
};
