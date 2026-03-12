import { renderHook } from '@testing-library/react';

import { TEN_SECONDS_INTERVAL } from '../../constants';
import { MiddlewareChainMap } from '../../constants/chains';
import { REACT_QUERY_KEYS } from '../../constants/reactQueryKeys';
import { BridgeService } from '../../service/Bridge';
import { Address } from '../../types/Address';
import {
  BridgeRefillRequirementsRequest,
  BridgeRefillRequirementsResponse,
} from '../../types/Bridge';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
} from '../helpers/factories';

// --- Mocks ---

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({ providers: [] }));
jest.mock('../../service/Bridge', () => ({
  BridgeService: {
    getBridgeRefillRequirements: jest.fn(),
  },
}));

// Mock OnlineStatusContext — default to online; tests override via mockOnlineValue
let mockOnlineValue = true;
jest.mock('../../context/OnlineStatusProvider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  OnlineStatusContext: require('react').createContext({
    get isOnline() {
      return mockOnlineValue;
    },
  }),
}));

// Capture useQuery config to test query options without running real queries
type CapturedConfig = {
  queryKey: unknown[];
  queryFn: (ctx: { signal: AbortSignal }) => Promise<unknown>;
  refetchInterval: number | false;
  refetchOnWindowFocus: boolean;
  enabled: boolean;
  staleTime: number;
  refetchOnMount: string;
  refetchOnReconnect: string;
};

let capturedConfig: CapturedConfig | null = null;

jest.mock('@tanstack/react-query', () => ({
  useQuery: (config: CapturedConfig) => {
    capturedConfig = config;
    return {
      data: undefined,
      isLoading: false,
      isFetching: false,
      isSuccess: false,
      isError: false,
      fetchStatus: config.enabled ? 'fetching' : 'idle',
    };
  },
}));

const mockGetBridgeRefillRequirements =
  BridgeService.getBridgeRefillRequirements as jest.MockedFunction<
    typeof BridgeService.getBridgeRefillRequirements
  >;

// --- Helpers ---

const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';

const mockBridgeParams: BridgeRefillRequirementsRequest = {
  bridge_requests: [
    {
      from: {
        chain: MiddlewareChainMap.ETHEREUM,
        address: DEFAULT_EOA_ADDRESS,
        token: ZERO_ADDRESS,
      },
      to: {
        chain: MiddlewareChainMap.BASE,
        address: DEFAULT_SAFE_ADDRESS,
        token: ZERO_ADDRESS,
        amount: '5628894686394391',
      },
    },
  ],
  force_update: false,
};

const mockResponse: BridgeRefillRequirementsResponse = {
  id: 'quote-bundle-123',
  balances: {},
  bridge_total_requirements: {},
  bridge_refill_requirements: {},
  bridge_request_status: [{ message: null, status: 'QUOTE_DONE', eta: 120 }],
  expiration_timestamp: Date.now() + 60_000,
  is_refill_required: true,
};

// --- Tests ---

describe('useBridgeRefillRequirements', () => {
  // Import after mocks are set up
  /* eslint-disable @typescript-eslint/no-var-requires */
  const {
    useBridgeRefillRequirements,
  } = require('../../hooks/useBridgeRefillRequirements');
  /* eslint-enable @typescript-eslint/no-var-requires */

  beforeEach(() => {
    jest.clearAllMocks();
    capturedConfig = null;
    mockOnlineValue = true;
    mockGetBridgeRefillRequirements.mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not fetch when params is null (enabled=false in query config)', () => {
    renderHook(() => useBridgeRefillRequirements({ params: null }));

    expect(capturedConfig).not.toBeNull();
    expect(capturedConfig!.enabled).toBe(false);
  });

  it('does not fetch when enabled is false', () => {
    renderHook(() =>
      useBridgeRefillRequirements({
        params: mockBridgeParams,
        enabled: false,
      }),
    );

    expect(capturedConfig!.enabled).toBe(false);
  });

  it('does not fetch when offline (isOnline=false)', () => {
    mockOnlineValue = false;

    renderHook(() => useBridgeRefillRequirements({ params: mockBridgeParams }));

    expect(capturedConfig!.enabled).toBe(false);
  });

  it('enables query when params provided, enabled, and online', () => {
    renderHook(() => useBridgeRefillRequirements({ params: mockBridgeParams }));

    expect(capturedConfig!.enabled).toBe(true);
  });

  it('returns null from queryFn when params is null (logs warning)', async () => {
    const warnSpy = jest
      .spyOn(window.console, 'warn')
      .mockImplementation(() => {});

    renderHook(() => useBridgeRefillRequirements({ params: null }));

    const signal = new AbortController().signal;
    const result = await capturedConfig!.queryFn({ signal });

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      'No parameters provided for bridge refill requirements',
    );
    expect(mockGetBridgeRefillRequirements).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('returns null when both enabled=false and canPoll=false', async () => {
    renderHook(() =>
      useBridgeRefillRequirements({
        params: mockBridgeParams,
        enabled: false,
        canPoll: false,
      }),
    );

    const signal = new AbortController().signal;
    const result = await capturedConfig!.queryFn({ signal });

    expect(result).toBeNull();
    expect(mockGetBridgeRefillRequirements).not.toHaveBeenCalled();
  });

  it('calls BridgeService.getBridgeRefillRequirements with params and signal', async () => {
    renderHook(() => useBridgeRefillRequirements({ params: mockBridgeParams }));

    const signal = new AbortController().signal;
    const result = await capturedConfig!.queryFn({ signal });

    expect(mockGetBridgeRefillRequirements).toHaveBeenCalledTimes(1);
    expect(mockGetBridgeRefillRequirements).toHaveBeenCalledWith(
      mockBridgeParams,
      signal,
    );
    expect(result).toEqual(mockResponse);
  });

  it('uses pollingInterval when enabled && canPoll', () => {
    renderHook(() =>
      useBridgeRefillRequirements({
        params: mockBridgeParams,
        canPoll: true,
        enabled: true,
      }),
    );

    expect(capturedConfig!.refetchInterval).toBe(TEN_SECONDS_INTERVAL);
  });

  it('stops polling when canPoll is false (refetchInterval=false)', () => {
    renderHook(() =>
      useBridgeRefillRequirements({
        params: mockBridgeParams,
        canPoll: false,
      }),
    );

    expect(capturedConfig!.refetchInterval).toBe(false);
  });

  it('stops polling when enabled is false', () => {
    renderHook(() =>
      useBridgeRefillRequirements({
        params: mockBridgeParams,
        enabled: false,
      }),
    );

    expect(capturedConfig!.refetchInterval).toBe(false);
  });

  it('uses custom pollingInterval when provided', () => {
    const customInterval = 30_000;

    renderHook(() =>
      useBridgeRefillRequirements({
        params: mockBridgeParams,
        pollingInterval: customInterval,
      }),
    );

    expect(capturedConfig!.refetchInterval).toBe(customInterval);
  });

  it('appends queryKeySuffix to query key', () => {
    const suffix = 'custom-suffix';

    renderHook(() =>
      useBridgeRefillRequirements({
        params: mockBridgeParams,
        queryKeySuffix: suffix,
      }),
    );

    const expectedKey = REACT_QUERY_KEYS.BRIDGE_REFILL_REQUIREMENTS_KEY(
      mockBridgeParams,
      suffix,
    );
    expect(capturedConfig!.queryKey).toEqual(expectedKey);
  });

  it('uses default queryKeySuffix when not provided', () => {
    renderHook(() => useBridgeRefillRequirements({ params: mockBridgeParams }));

    const expectedKey = REACT_QUERY_KEYS.BRIDGE_REFILL_REQUIREMENTS_KEY(
      mockBridgeParams,
      undefined,
    );
    expect(capturedConfig!.queryKey).toEqual(expectedKey);
  });

  it('defaults pollingInterval to TEN_SECONDS_INTERVAL', () => {
    expect(TEN_SECONDS_INTERVAL).toBe(10_000);

    renderHook(() => useBridgeRefillRequirements({ params: mockBridgeParams }));

    expect(capturedConfig!.refetchInterval).toBe(TEN_SECONDS_INTERVAL);
  });

  it('sets refetchOnWindowFocus to false', () => {
    renderHook(() => useBridgeRefillRequirements({ params: mockBridgeParams }));

    expect(capturedConfig!.refetchOnWindowFocus).toBe(false);
  });

  it('sets staleTime to 0', () => {
    renderHook(() => useBridgeRefillRequirements({ params: mockBridgeParams }));

    expect(capturedConfig!.staleTime).toBe(0);
  });

  it('sets refetchOnMount to always', () => {
    renderHook(() => useBridgeRefillRequirements({ params: mockBridgeParams }));

    expect(capturedConfig!.refetchOnMount).toBe('always');
  });

  it('sets refetchOnReconnect to always', () => {
    renderHook(() => useBridgeRefillRequirements({ params: mockBridgeParams }));

    expect(capturedConfig!.refetchOnReconnect).toBe('always');
  });
});
