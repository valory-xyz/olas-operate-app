import { renderHook } from '@testing-library/react';

import {
  FIVE_MINUTE_INTERVAL,
  GITHUB_API_LATEST_RELEASE,
  REACT_QUERY_KEYS,
} from '../../../../constants';

// --- Mocks ---

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({ providers: [] }));

const mockGetAppVersion = jest.fn();

jest.mock('../../../../hooks', () => ({
  useElectronApi: () => ({ getAppVersion: mockGetAppVersion }),
}));

// Capture useQuery config to test query options without running real queries
type CapturedConfig = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  refetchInterval: number;
  refetchOnWindowFocus: boolean;
};

let capturedConfig: CapturedConfig | null = null;

jest.mock('@tanstack/react-query', () => ({
  useQuery: (config: CapturedConfig) => {
    capturedConfig = config;
    return { data: undefined, isLoading: false };
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// --- Tests ---

describe('useAppStatus', () => {
  // Import after mocks are set up
  /* eslint-disable @typescript-eslint/no-var-requires */
  const {
    useAppStatus,
    SemverComparisonResult,
  } = require('../../../../components/MainPage/UpdateAvailableAlert/useAppStatus');
  /* eslint-enable @typescript-eslint/no-var-requires */

  beforeEach(() => {
    jest.clearAllMocks();
    capturedConfig = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('SemverComparisonResult enum', () => {
    it('has OUTDATED = -1', () => {
      expect(SemverComparisonResult.OUTDATED).toBe(-1);
    });

    it('has EQUAL = 0', () => {
      expect(SemverComparisonResult.EQUAL).toBe(0);
    });

    it('has UPDATED = 1', () => {
      expect(SemverComparisonResult.UPDATED).toBe(1);
    });
  });

  describe('query config', () => {
    it('uses correct queryKey', () => {
      renderHook(() => useAppStatus());

      expect(capturedConfig).not.toBeNull();
      expect(capturedConfig!.queryKey).toEqual(
        REACT_QUERY_KEYS.IS_PEARL_OUTDATED_KEY,
      );
    });

    it('sets refetchInterval to FIVE_MINUTE_INTERVAL', () => {
      renderHook(() => useAppStatus());

      expect(capturedConfig!.refetchInterval).toBe(FIVE_MINUTE_INTERVAL);
    });

    it('sets refetchOnWindowFocus to false', () => {
      renderHook(() => useAppStatus());

      expect(capturedConfig!.refetchOnWindowFocus).toBe(false);
    });
  });

  describe('queryFn', () => {
    it('throws when getAppVersion is undefined', async () => {
      // Need to re-require the module to pick up the new mock
      jest.resetModules();

      // Re-setup the mocks after resetModules
      /* eslint-disable @typescript-eslint/no-var-requires */
      jest.doMock(
        'ethers-multicall',
        () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
      );
      jest.doMock('../../../../constants/providers', () => ({}));
      jest.doMock('../../../../config/providers', () => ({ providers: [] }));
      jest.doMock('../../../../hooks', () => ({
        useElectronApi: () => ({ getAppVersion: undefined }),
      }));

      let innerCapturedConfig: CapturedConfig | null = null;
      jest.doMock('@tanstack/react-query', () => ({
        useQuery: (config: CapturedConfig) => {
          innerCapturedConfig = config;
          return { data: undefined, isLoading: false };
        },
      }));

      const {
        useAppStatus: freshUseAppStatus,
      } = require('../../../../components/MainPage/UpdateAvailableAlert/useAppStatus');
      /* eslint-enable @typescript-eslint/no-var-requires */

      renderHook(() => freshUseAppStatus());

      await expect(innerCapturedConfig!.queryFn()).rejects.toThrow(
        'getAppVersion is not available',
      );
    });

    it('throws when appVersion is undefined', async () => {
      mockGetAppVersion.mockResolvedValue(undefined);

      renderHook(() => useAppStatus());

      await expect(capturedConfig!.queryFn()).rejects.toThrow(
        'App version is undefined',
      );
    });

    it('throws when fetch response is not ok', async () => {
      mockGetAppVersion.mockResolvedValue('1.0.0');
      mockFetch.mockResolvedValue({ ok: false });

      renderHook(() => useAppStatus());

      await expect(capturedConfig!.queryFn()).rejects.toThrow(
        'Failed to fetch latest release',
      );
      expect(mockFetch).toHaveBeenCalledWith(GITHUB_API_LATEST_RELEASE);
    });

    it('throws when semver cannot parse the latest tag', async () => {
      mockGetAppVersion.mockResolvedValue('1.0.0');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: 'not-a-valid-semver' }),
      });

      renderHook(() => useAppStatus());

      await expect(capturedConfig!.queryFn()).rejects.toThrow(
        'Failed to parse semver',
      );
    });

    it('throws when semver cannot parse the current version', async () => {
      mockGetAppVersion.mockResolvedValue('not-valid');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: 'v1.2.0' }),
      });

      renderHook(() => useAppStatus());

      await expect(capturedConfig!.queryFn()).rejects.toThrow(
        'Failed to parse semver',
      );
    });

    it('returns isOutdated=true when current version < latest version', async () => {
      mockGetAppVersion.mockResolvedValue('1.0.0');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: 'v2.0.0' }),
      });

      renderHook(() => useAppStatus());

      const result = await capturedConfig!.queryFn();
      expect(result).toEqual({
        isOutdated: true,
        latestTag: 'v2.0.0',
      });
    });

    it('returns isOutdated=false when current version = latest version', async () => {
      mockGetAppVersion.mockResolvedValue('1.0.0');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: 'v1.0.0' }),
      });

      renderHook(() => useAppStatus());

      const result = await capturedConfig!.queryFn();
      expect(result).toEqual({
        isOutdated: false,
        latestTag: 'v1.0.0',
      });
    });

    it('returns isOutdated=false when current version > latest version', async () => {
      mockGetAppVersion.mockResolvedValue('3.0.0');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: 'v2.0.0' }),
      });

      renderHook(() => useAppStatus());

      const result = await capturedConfig!.queryFn();
      expect(result).toEqual({
        isOutdated: false,
        latestTag: 'v2.0.0',
      });
    });

    it('returns the latestTag from the GitHub API response', async () => {
      mockGetAppVersion.mockResolvedValue('1.0.0');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: 'v1.5.3' }),
      });

      renderHook(() => useAppStatus());

      const result = await capturedConfig!.queryFn();
      expect(result).toHaveProperty('latestTag', 'v1.5.3');
    });

    it('fetches from GITHUB_API_LATEST_RELEASE URL', async () => {
      mockGetAppVersion.mockResolvedValue('1.0.0');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: 'v1.0.0' }),
      });

      renderHook(() => useAppStatus());

      await capturedConfig!.queryFn();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(GITHUB_API_LATEST_RELEASE);
    });

    it('handles pre-release versions correctly', async () => {
      mockGetAppVersion.mockResolvedValue('1.0.0-rc.1');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: 'v1.0.0' }),
      });

      renderHook(() => useAppStatus());

      const result = await capturedConfig!.queryFn();
      expect(result).toEqual({
        isOutdated: true,
        latestTag: 'v1.0.0',
      });
    });
  });
});
