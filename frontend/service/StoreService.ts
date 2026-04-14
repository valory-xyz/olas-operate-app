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
    if (!response.ok) {
      throw new Error(`Failed to fetch pearl store (HTTP ${response.status})`);
    }
    return response.json().then((json) => {
      const data = json.data ?? {};
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('Pearl store data is not a valid object');
      }
      return data as PearlStore;
    });
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
    if (!response.ok) {
      throw new Error(
        `Failed to set store key '${key}' (HTTP ${response.status})`,
      );
    }
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
    if (!response.ok) {
      throw new Error(
        `Failed to delete store key '${key}' (HTTP ${response.status})`,
      );
    }
  });

export const StoreService = {
  getStore,
  setStoreKey,
  deleteStoreKey,
};
