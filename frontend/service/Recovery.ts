import { BACKEND_URL, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import { ExtendedWallet } from '@/types/Recovery';

import extendedWalletResponse from './Recovery.json';

const isDebug = true;
/**
 * Extended wallet information including safes and additional metadata.
 */
const getExtendedWallet = async (
  signal?: AbortSignal,
): Promise<ExtendedWallet[]> =>
  isDebug
    ? Promise.resolve(extendedWalletResponse as ExtendedWallet[])
    : fetch(`${BACKEND_URL}/extended/wallet`, {
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
