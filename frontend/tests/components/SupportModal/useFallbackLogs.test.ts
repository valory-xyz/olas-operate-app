import { renderHook } from '@testing-library/react';

import { REACT_QUERY_KEYS } from '../../../constants/reactQueryKeys';
import {
  AGENT_KEY_ADDRESS,
  DEFAULT_SERVICE_CONFIG_ID,
  makeMiddlewareService,
} from '../../helpers/factories';

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

const mockGetServices = jest.fn();
jest.mock('../../../service/Services', () => ({
  ServicesService: {
    getServices: (...args: unknown[]) => mockGetServices(...args),
  },
}));

// Capture useQuery config
type QueryConfig = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  retry: number;
  staleTime: number;
};

let capturedQueryConfig: QueryConfig | null = null;
let mockQueryData: unknown = undefined;
let mockIsFetched = false;

jest.mock('@tanstack/react-query', () => ({
  useQuery: (config: QueryConfig) => {
    capturedQueryConfig = config;
    return {
      data: mockQueryData,
      isFetched: mockIsFetched,
    };
  },
}));

// ---------------------------------------------------------------------------
// Import hook after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
const {
  useFallbackLogs,
} = require('../../../components/SupportModal/useFallbackLogs');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFallbackLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedQueryConfig = null;
    mockQueryData = undefined;
    mockIsFetched = false;
  });

  describe('useQuery configuration', () => {
    it('sets queryKey to REACT_QUERY_KEYS.SERVICES_KEY', () => {
      renderHook(() => useFallbackLogs());
      expect(capturedQueryConfig?.queryKey).toEqual(
        REACT_QUERY_KEYS.SERVICES_KEY,
      );
      expect(capturedQueryConfig?.queryKey).toEqual(['services']);
    });

    it('sets retry count to 1', () => {
      renderHook(() => useFallbackLogs());
      expect(capturedQueryConfig?.retry).toBe(1);
    });

    it('sets staleTime to 30_000 ms', () => {
      renderHook(() => useFallbackLogs());
      expect(capturedQueryConfig?.staleTime).toBe(30_000);
    });

    it('passes queryFn that calls ServicesService.getServices', async () => {
      const mockServices = [makeMiddlewareService()];
      mockGetServices.mockResolvedValue(mockServices);

      renderHook(() => useFallbackLogs());

      const result = await capturedQueryConfig!.queryFn();
      expect(mockGetServices).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockServices);
    });

    it('propagates errors from ServicesService.getServices', async () => {
      const error = new Error('Failed to fetch services');
      mockGetServices.mockRejectedValue(error);

      renderHook(() => useFallbackLogs());

      await expect(capturedQueryConfig!.queryFn()).rejects.toThrow(
        'Failed to fetch services',
      );
    });
  });

  describe('formattedServices', () => {
    it('maps service keys to their addresses', () => {
      const service = makeMiddlewareService(undefined, {
        keys: [
          {
            address: AGENT_KEY_ADDRESS,
            private_key: 'pk1',
            ledger: 'ethereum',
          },
        ],
      });
      mockQueryData = [service];
      mockIsFetched = true;

      const { result } = renderHook(() => useFallbackLogs());

      const formattedService = result.current.debugData.services.services[0];
      expect(formattedService.keys).toEqual([AGENT_KEY_ADDRESS]);
    });

    it('preserves other service fields in formatted output', () => {
      const service = makeMiddlewareService(undefined, {
        service_config_id: DEFAULT_SERVICE_CONFIG_ID,
        name: 'Trader Agent',
        keys: [],
      });
      mockQueryData = [service];
      mockIsFetched = true;

      const { result } = renderHook(() => useFallbackLogs());

      const formattedService = result.current.debugData.services.services[0];
      expect(formattedService.service_config_id).toBe(
        DEFAULT_SERVICE_CONFIG_ID,
      );
      expect(formattedService.name).toBe('Trader Agent');
    });

    it('handles multiple services with multiple keys', () => {
      const secondKeyAddress = '0xDdDDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd';
      const service1 = makeMiddlewareService(undefined, {
        keys: [
          {
            address: AGENT_KEY_ADDRESS,
            private_key: 'pk1',
            ledger: 'ethereum',
          },
        ],
      });
      const service2 = makeMiddlewareService(undefined, {
        keys: [
          {
            address: AGENT_KEY_ADDRESS,
            private_key: 'pk2',
            ledger: 'ethereum',
          },
          {
            address: secondKeyAddress as `0x${string}`,
            private_key: 'pk3',
            ledger: 'ethereum',
          },
        ],
      });
      mockQueryData = [service1, service2];
      mockIsFetched = true;

      const { result } = renderHook(() => useFallbackLogs());

      const services = result.current.debugData.services.services;
      expect(services).toHaveLength(2);
      expect(services[0].keys).toEqual([AGENT_KEY_ADDRESS]);
      expect(services[1].keys).toEqual([AGENT_KEY_ADDRESS, secondKeyAddress]);
    });
  });

  describe('logs structure', () => {
    it('returns services as null when not yet fetched', () => {
      mockQueryData = undefined;
      mockIsFetched = false;

      const { result } = renderHook(() => useFallbackLogs());

      expect(result.current.debugData.services).toBeNull();
    });

    it('returns formatted services when fetched', () => {
      const service = makeMiddlewareService(undefined, { keys: [] });
      mockQueryData = [service];
      mockIsFetched = true;

      const { result } = renderHook(() => useFallbackLogs());

      expect(result.current.debugData.services).not.toBeNull();
      expect(result.current.debugData.services.services).toHaveLength(1);
    });

    it('returns empty wallets array in debugData', () => {
      mockIsFetched = true;
      mockQueryData = [];

      const { result } = renderHook(() => useFallbackLogs());

      expect(result.current.debugData.wallets).toEqual([]);
    });

    it('returns empty balances array in debugData', () => {
      mockIsFetched = true;
      mockQueryData = [];

      const { result } = renderHook(() => useFallbackLogs());

      expect(result.current.debugData.balances).toEqual([]);
    });

    it('returns complete debugData shape when services are fetched', () => {
      mockQueryData = [];
      mockIsFetched = true;

      const { result } = renderHook(() => useFallbackLogs());

      expect(result.current).toEqual({
        debugData: {
          services: { services: [] },
          wallets: [],
          balances: [],
        },
      });
    });

    it('handles undefined services data gracefully when fetched', () => {
      mockQueryData = undefined;
      mockIsFetched = true;

      const { result } = renderHook(() => useFallbackLogs());

      // formattedServices will be undefined, but wrapped in object
      expect(result.current.debugData.services).toEqual({
        services: undefined,
      });
    });
  });
});
