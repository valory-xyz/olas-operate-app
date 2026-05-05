import { SupportedMiddlewareChain } from '@/constants';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL } from '@/constants/urls';
import { Address } from '@/types';

type EoaTopups = {
  [chainName in SupportedMiddlewareChain]: {
    [address: Address]: string;
  };
};
type EoaThresholds = {
  [chainName in SupportedMiddlewareChain]: {
    [address: Address]: string;
  };
};
type SettingsResponse = {
  version: number;
  eoa_topups: EoaTopups;
  eoa_thresholds: EoaThresholds;
};

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
