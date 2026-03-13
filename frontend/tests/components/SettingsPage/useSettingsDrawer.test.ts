import { renderHook } from '@testing-library/react';

import { REACT_QUERY_KEYS } from '../../../constants/reactQueryKeys';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({ providers: [] }));

const mockGetSettings = jest.fn();
jest.mock('../../../service/Settings', () => ({
  SettingsService: {
    getSettings: (...args: unknown[]) => mockGetSettings(...args),
  },
}));

// Capture useQuery config
type QueryConfig = {
  queryKey: unknown[];
  queryFn: (context: { signal: AbortSignal }) => Promise<unknown>;
};

let capturedQueryConfig: QueryConfig | null = null;

jest.mock('@tanstack/react-query', () => ({
  useQuery: (config: QueryConfig) => {
    capturedQueryConfig = config;
    return {
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    };
  },
}));

// ---------------------------------------------------------------------------
// Import hook after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
const {
  useSettingsDrawer,
} = require('../../../components/SettingsPage/useSettingsDrawer');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSettingsDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedQueryConfig = null;
  });

  describe('useQuery configuration', () => {
    it('sets queryKey to REACT_QUERY_KEYS.SETTINGS_KEY', () => {
      renderHook(() => useSettingsDrawer());
      expect(capturedQueryConfig?.queryKey).toEqual(
        REACT_QUERY_KEYS.SETTINGS_KEY,
      );
      expect(capturedQueryConfig?.queryKey).toEqual(['settings']);
    });

    it('passes queryFn that calls SettingsService.getSettings with the signal', async () => {
      const mockSettings = { version: 1, eoa_topups: {}, eoa_thresholds: {} };
      mockGetSettings.mockResolvedValue(mockSettings);

      renderHook(() => useSettingsDrawer());

      const signal = new AbortController().signal;
      const result = await capturedQueryConfig!.queryFn({ signal });

      expect(mockGetSettings).toHaveBeenCalledTimes(1);
      expect(mockGetSettings).toHaveBeenCalledWith(signal);
      expect(result).toEqual(mockSettings);
    });

    it('propagates errors from SettingsService.getSettings', async () => {
      const error = new Error('Failed to fetch settings');
      mockGetSettings.mockRejectedValue(error);

      renderHook(() => useSettingsDrawer());

      const signal = new AbortController().signal;
      await expect(capturedQueryConfig!.queryFn({ signal })).rejects.toThrow(
        'Failed to fetch settings',
      );
    });
  });
});
