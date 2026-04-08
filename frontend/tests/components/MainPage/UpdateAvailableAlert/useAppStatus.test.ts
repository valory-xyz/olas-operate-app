import { renderHook } from '@testing-library/react';

import { REACT_QUERY_KEYS, SIXTY_MINUTE_INTERVAL } from '../../../../constants';

// --- Mocks ---

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({ providers: [] }));

const mockCheckForUpdates = jest.fn();
const mockOnUpdateAvailable = jest.fn();

jest.mock('../../../../hooks', () => ({
  useElectronApi: () => ({
    updates: {
      checkForUpdates: mockCheckForUpdates,
      onUpdateAvailable: mockOnUpdateAvailable,
    },
  }),
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

// --- Tests ---

describe('useAppStatus', () => {
  // Import after mocks are set up
  /* eslint-disable @typescript-eslint/no-var-requires */
  const { useAppStatus } = require('../../../../components/MainPage/UpdateAvailableAlert/useAppStatus');
  /* eslint-enable @typescript-eslint/no-var-requires */

  beforeEach(() => {
    jest.clearAllMocks();
    capturedConfig = null;
    // Default: onUpdateAvailable returns a cleanup fn, checkForUpdates never resolves
    mockOnUpdateAvailable.mockReturnValue(() => {});
    mockCheckForUpdates.mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('query config', () => {
    it('uses correct queryKey', () => {
      renderHook(() => useAppStatus());

      expect(capturedConfig).not.toBeNull();
      expect(capturedConfig!.queryKey).toEqual(
        REACT_QUERY_KEYS.IS_PEARL_OUTDATED_KEY,
      );
    });

    it('sets refetchInterval to SIXTY_MINUTE_INTERVAL', () => {
      renderHook(() => useAppStatus());

      expect(capturedConfig!.refetchInterval).toBe(SIXTY_MINUTE_INTERVAL);
    });

    it('sets refetchOnWindowFocus to false', () => {
      renderHook(() => useAppStatus());

      expect(capturedConfig!.refetchOnWindowFocus).toBe(false);
    });
  });

  describe('queryFn', () => {
    it('rejects when updates API is not available', async () => {
      jest.resetModules();

      /* eslint-disable @typescript-eslint/no-var-requires */
      jest.doMock(
        'ethers-multicall',
        () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
      );
      jest.doMock('../../../../constants/providers', () => ({}));
      jest.doMock('../../../../config/providers', () => ({ providers: [] }));
      jest.doMock('../../../../hooks', () => ({
        useElectronApi: () => ({ updates: undefined }),
      }));

      let innerCapturedConfig: CapturedConfig | null = null;
      jest.doMock('@tanstack/react-query', () => ({
        useQuery: (config: CapturedConfig) => {
          innerCapturedConfig = config;
          return { data: undefined, isLoading: false };
        },
      }));

      const { useAppStatus: freshUseAppStatus } = require('../../../../components/MainPage/UpdateAvailableAlert/useAppStatus');
      /* eslint-enable @typescript-eslint/no-var-requires */

      renderHook(() => freshUseAppStatus());

      await expect(innerCapturedConfig!.queryFn()).rejects.toThrow(
        'updates API is not available',
      );
    });

    it('resolves with isOutdated=true when onUpdateAvailable fires before checkForUpdates resolves', async () => {
      let capturedCb: ((info: { version: string; releaseNotes: string }) => void) | null = null;
      mockOnUpdateAvailable.mockImplementation(
        (cb: (info: { version: string; releaseNotes: string }) => void) => {
          capturedCb = cb;
          return () => {};
        },
      );
      // checkForUpdates resolves only after the event fires
      mockCheckForUpdates.mockReturnValue(new Promise(() => {}));

      renderHook(() => useAppStatus());

      const promise = capturedConfig!.queryFn();

      // Simulate update-available event firing
      capturedCb!({ version: 'v2.0.0', releaseNotes: '## New features\n- OTA' });

      const result = await promise;
      expect(result).toEqual({
        isOutdated: true,
        latestTag: 'v2.0.0',
        releaseNotes: '## New features\n- OTA',
      });
    });

    it('resolves with isOutdated=false when checkForUpdates resolves and no update-available fired', async () => {
      mockOnUpdateAvailable.mockReturnValue(() => {});
      mockCheckForUpdates.mockResolvedValue(null);

      renderHook(() => useAppStatus());

      const result = await capturedConfig!.queryFn();
      expect(result).toEqual({
        isOutdated: false,
        latestTag: null,
        releaseNotes: null,
      });
    });

    it('rejects when checkForUpdates throws and no update-available fired', async () => {
      mockOnUpdateAvailable.mockReturnValue(() => {});
      mockCheckForUpdates.mockRejectedValue(new Error('network error'));

      renderHook(() => useAppStatus());

      await expect(capturedConfig!.queryFn()).rejects.toThrow('network error');
    });

    it('calls checkForUpdates', async () => {
      mockCheckForUpdates.mockResolvedValue(null);

      renderHook(() => useAppStatus());

      await capturedConfig!.queryFn();

      expect(mockCheckForUpdates).toHaveBeenCalledTimes(1);
    });

    it('registers onUpdateAvailable listener', async () => {
      mockCheckForUpdates.mockResolvedValue(null);

      renderHook(() => useAppStatus());

      await capturedConfig!.queryFn();

      expect(mockOnUpdateAvailable).toHaveBeenCalledTimes(1);
    });

    it('calls onUpdateAvailable cleanup after checkForUpdates resolves', async () => {
      const mockCleanup = jest.fn();
      mockOnUpdateAvailable.mockReturnValue(mockCleanup);
      mockCheckForUpdates.mockResolvedValue(null);

      renderHook(() => useAppStatus());

      await capturedConfig!.queryFn();

      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it('includes releaseNotes=null when releaseNotes is not a string', async () => {
      let capturedCb: ((info: { version: string; releaseNotes: unknown }) => void) | null = null;
      mockOnUpdateAvailable.mockImplementation(
        (cb: (info: { version: string; releaseNotes: unknown }) => void) => {
          capturedCb = cb;
          return () => {};
        },
      );
      mockCheckForUpdates.mockReturnValue(new Promise(() => {}));

      renderHook(() => useAppStatus());

      const promise = capturedConfig!.queryFn();

      capturedCb!({ version: 'v2.0.0', releaseNotes: null });

      const result = await promise;
      expect(result).toEqual({
        isOutdated: true,
        latestTag: 'v2.0.0',
        releaseNotes: null,
      });
    });
  });
});
