import { BACKEND_URL, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import { PearlStore } from '@/types/ElectronApi';

/**
 * Gets the full pearl store from the backend.
 * Returns {} if the store file does not exist yet, is corrupted (500),
 * or contains invalid data. The store holds frontend preferences only —
 * falling back to empty is safe (user re-does setup, no data loss).
 */
const getStore = async (): Promise<PearlStore> =>
  fetch(`${BACKEND_URL}/store`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then(async (response) => {
    // Store not created yet or corrupted — treat as empty.
    if (response.status === 404 || response.status === 204) {
      return {} as PearlStore;
    }
    if (response.status === 500) {
      console.error(
        'Pearl store may be corrupted (HTTP 500), falling back to empty store',
      );
      return {} as PearlStore;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch pearl store (HTTP ${response.status})`);
    }

    let json: { data?: unknown };
    try {
      json = await response.json();
    } catch {
      console.error(
        'Pearl store response is not valid JSON, falling back to empty store',
      );
      return {} as PearlStore;
    }

    const data = json.data ?? {};
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      console.error(
        'Pearl store data is not a valid object, falling back to empty store',
      );
      return {} as PearlStore;
    }
    return data as PearlStore;
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
