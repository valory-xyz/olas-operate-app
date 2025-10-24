import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL } from '@/constants/urls';

export interface EoaTopups {
  [chainName: string]: {
    [address: string]: number;
  };
}

export interface SettingsResponse {
  version: number;
  eoa_topups: EoaTopups;
}

/**
 * Fetches settings from the backend
 */
const getSettings = async (signal?: AbortSignal): Promise<SettingsResponse> =>
  fetch(`${BACKEND_URL}/settings`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((response) => {
    if (response.ok) return response.json();
    throw new Error('Failed to fetch settings');
  });

export const SettingsService = {
  getSettings,
};
