import { renderHook } from '@testing-library/react';

import { REACT_QUERY_KEYS } from '../../constants';
import { AddressZero } from '../../constants/address';
import { MiddlewareChainMap } from '../../constants/chains';
import { BridgeService } from '../../service/Bridge';
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

// Capture useQuery config to test query options and invoke queryFn directly
type CapturedConfig = {
  queryKey: unknown[];
  queryFn: (ctx: { signal: AbortSignal }) => Promise<unknown>;
  enabled: boolean;
  retry: boolean;
  staleTime: number;
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
      fetchStatus: 'idle',
      refetch: jest.fn(),
    };
  },
}));

const mockGetBridgeRefillRequirements =
  BridgeService.getBridgeRefillRequirements as jest.MockedFunction<
    typeof BridgeService.getBridgeRefillRequirements
  >;

// --- Helpers ---

const mockBridgeParams: BridgeRefillRequirementsRequest = {
  bridge_requests: [
    {
      from: {
        chain: MiddlewareChainMap.ETHEREUM,
        address: DEFAULT_EOA_ADDRESS,
        token: AddressZero,
      },
      to: {
        chain: MiddlewareChainMap.BASE,
        address: DEFAULT_SAFE_ADDRESS,
        token: AddressZero,
        amount: '5628894686394391',
      },
    },
  ],
  force_update: false,
};

const mockResponse: BridgeRefillRequirementsResponse = {
  id: 'quote-bundle-456',
  balances: {},
  bridge_total_requirements: {},
  bridge_refill_requirements: {},
  bridge_request_status: [{ message: null, status: 'QUOTE_DONE', eta: 120 }],
  expiration_timestamp: Date.now() + 60_000,
  is_refill_required: true,
};

// --- Tests ---

describe('useBridgeRefillRequirementsOnDemand', () => {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const {
    useBridgeRefillRequirementsOnDemand,
  } = require('../../hooks/useBridgeRefillRequirementsOnDemand');
  /* eslint-enable @typescript-eslint/no-var-requires */

  beforeEach(() => {
    jest.clearAllMocks();
    capturedConfig = null;
    mockGetBridgeRefillRequirements.mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not auto-fetch (enabled: false)', () => {
    renderHook(() => useBridgeRefillRequirementsOnDemand(mockBridgeParams));

    expect(capturedConfig).not.toBeNull();
    expect(capturedConfig!.enabled).toBe(false);
  });

  it('does not auto-fetch when params is null', () => {
    renderHook(() => useBridgeRefillRequirementsOnDemand(null));

    expect(capturedConfig!.enabled).toBe(false);
  });

  it('returns null from queryFn when params is null (logs warning)', async () => {
    const warnSpy = jest
      .spyOn(window.console, 'warn')
      .mockImplementation(() => {});

    renderHook(() => useBridgeRefillRequirementsOnDemand(null));

    const signal = new AbortController().signal;
    const result = await capturedConfig!.queryFn({ signal });

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      'No parameters provided for bridge refill requirements',
    );
    expect(mockGetBridgeRefillRequirements).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('calls BridgeService.getBridgeRefillRequirements with params and signal', async () => {
    renderHook(() => useBridgeRefillRequirementsOnDemand(mockBridgeParams));

    const signal = new AbortController().signal;
    const result = await capturedConfig!.queryFn({ signal });

    expect(mockGetBridgeRefillRequirements).toHaveBeenCalledTimes(1);
    expect(mockGetBridgeRefillRequirements).toHaveBeenCalledWith(
      mockBridgeParams,
      signal,
    );
    expect(result).toEqual(mockResponse);
  });

  it('has retry:false (does not retry failures)', () => {
    renderHook(() => useBridgeRefillRequirementsOnDemand(mockBridgeParams));

    expect(capturedConfig!.retry).toBe(false);
  });

  it('uses the correct query key structure', () => {
    // NOTE: The source hook embeds the function reference (not its result)
    // in the queryKey array. This mirrors the actual source behavior.
    renderHook(() => useBridgeRefillRequirementsOnDemand(mockBridgeParams));

    expect(capturedConfig!.queryKey).toEqual([
      REACT_QUERY_KEYS.BRIDGE_REFILL_REQUIREMENTS_KEY_ON_DEMAND,
      mockBridgeParams,
    ]);
  });

  it('sets staleTime to 0', () => {
    renderHook(() => useBridgeRefillRequirementsOnDemand(mockBridgeParams));

    expect(capturedConfig!.staleTime).toBe(0);
  });

  it('passes AbortSignal to BridgeService', async () => {
    renderHook(() => useBridgeRefillRequirementsOnDemand(mockBridgeParams));

    const controller = new AbortController();
    await capturedConfig!.queryFn({ signal: controller.signal });

    const [, passedSignal] = mockGetBridgeRefillRequirements.mock.calls[0];
    expect(passedSignal).toBe(controller.signal);
  });
});
