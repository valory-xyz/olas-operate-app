import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { useFundRecoveryScan } from '../../hooks/useFundRecoveryScan';
import { FundRecoveryService } from '../../service/FundRecovery';
import { FundRecoveryScanResponse } from '../../types/FundRecovery';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

jest.mock('../../service/FundRecovery', () => ({
  FundRecoveryService: {
    scan: jest.fn(),
    execute: jest.fn(),
  },
}));

const mockScan = FundRecoveryService.scan as jest.Mock;

const SAMPLE_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const SAMPLE_ADDRESS = '0x1234567890AbcdEF1234567890aBcdef12345678' as `0x${string}`;

const SAMPLE_SCAN_RESPONSE: FundRecoveryScanResponse = {
  master_eoa_address: SAMPLE_ADDRESS,
  balances: {
    '100': {
      [SAMPLE_ADDRESS]: {
        ['0x0000000000000000000000000000000000000000' as `0x${string}`]:
          '1000000000000000000',
      },
    },
  },
  services: [],
  gas_warning: {},
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useFundRecoveryScan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in idle state before mutation is called', () => {
    const { result } = renderHook(() => useFundRecoveryScan(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('resolves with scan data on successful scan', async () => {
    mockScan.mockResolvedValue(SAMPLE_SCAN_RESPONSE);

    const { result } = renderHook(() => useFundRecoveryScan(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ mnemonic: SAMPLE_MNEMONIC });
    });

    expect(result.current.data).toEqual(SAMPLE_SCAN_RESPONSE);
    expect(result.current.error).toBeNull();
  });

  it('calls FundRecoveryService.scan with the provided mnemonic', async () => {
    mockScan.mockResolvedValue(SAMPLE_SCAN_RESPONSE);

    const { result } = renderHook(() => useFundRecoveryScan(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ mnemonic: SAMPLE_MNEMONIC });
    });

    expect(mockScan).toHaveBeenCalledWith({ mnemonic: SAMPLE_MNEMONIC });
  });

  it('surfaces the error when scan fails', async () => {
    const scanError = new Error('Invalid mnemonic');
    mockScan.mockRejectedValue(scanError);

    const { result } = renderHook(() => useFundRecoveryScan(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ mnemonic: 'bad phrase' });
    });

    expect(result.current.error).toEqual(scanError);
    expect(result.current.data).toBeUndefined();
  });

  it('resets state after reset() is called', async () => {
    mockScan.mockResolvedValue(SAMPLE_SCAN_RESPONSE);

    const { result } = renderHook(() => useFundRecoveryScan(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ mnemonic: SAMPLE_MNEMONIC });
    });

    expect(result.current.data).toEqual(SAMPLE_SCAN_RESPONSE);

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });
});
