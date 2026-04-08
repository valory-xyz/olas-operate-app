import { BACKEND_URL, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import { PearlStore } from '@/types/ElectronApi';

/**
 * Gets the full pearl store from the backend.
 * Returns {} if the store file does not exist yet on the backend.
 */
const getStore = async (): Promise<PearlStore> =>
  fetch(`${BACKEND_URL}/store`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (response.ok) return response.json().then((json) => json.data ?? {});
    throw new Error('Failed to fetch pearl store');
  });

/**
 * Sets a key in the pearl store.
 * Supports dot-notation keys for nested writes (e.g. "trader.isInitialFunded").
 */
const setStoreKey = async (key: string, value: unknown): Promise<void> =>
  fetch(`${BACKEND_URL}/store`, {
    method: 'POST',
    body: JSON.stringify({ key, value }),
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (!response.ok) throw new Error(`Failed to set store key: ${key}`);
  });

/**
 * Deletes a key from the pearl store.
 * Supports dot-notation keys (e.g. "trader.isInitialFunded").
 */
const deleteStoreKey = async (key: string): Promise<void> =>
  fetch(`${BACKEND_URL}/store/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (!response.ok) throw new Error(`Failed to delete store key: ${key}`);
  });

export const StoreService = {
  getStore,
  setStoreKey,
  deleteStoreKey,
};
