import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { useFundRecoveryExecute } from '../../hooks/useFundRecoveryExecute';
import { FundRecoveryService } from '../../service/FundRecovery';
import {
  FundRecoveryExecuteResponse,
} from '../../types/FundRecovery';

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

const mockExecute = FundRecoveryService.execute as jest.Mock;

const SAMPLE_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const SAMPLE_DESTINATION =
  '0x1234567890AbcdEF1234567890aBcdef12345678' as `0x${string}`;

const SAMPLE_SUCCESS_RESPONSE: FundRecoveryExecuteResponse = {
  success: true,
  partial_failure: false,
  total_funds_moved: {
    '100': {
      [SAMPLE_DESTINATION]: {
        ['0x0000000000000000000000000000000000000000' as `0x${string}`]:
          '1000000000000000000',
      },
    },
  },
  errors: [],
};

const SAMPLE_PARTIAL_RESPONSE: FundRecoveryExecuteResponse = {
  success: false,
  partial_failure: true,
  total_funds_moved: {},
  errors: ['Chain 100: execution failed'],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
};

describe('useFundRecoveryExecute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in idle state before mutation is called', () => {
    const { result } = renderHook(() => useFundRecoveryExecute(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('resolves with execute data on full success', async () => {
    mockExecute.mockResolvedValue(SAMPLE_SUCCESS_RESPONSE);

    const { result } = renderHook(() => useFundRecoveryExecute(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        mnemonic: SAMPLE_MNEMONIC,
        destination_address: SAMPLE_DESTINATION,
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(SAMPLE_SUCCESS_RESPONSE);
    });
    expect(result.current.error).toBeNull();
  });

  it('resolves with partial failure response (no error thrown)', async () => {
    mockExecute.mockResolvedValue(SAMPLE_PARTIAL_RESPONSE);

    const { result } = renderHook(() => useFundRecoveryExecute(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        mnemonic: SAMPLE_MNEMONIC,
        destination_address: SAMPLE_DESTINATION,
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(SAMPLE_PARTIAL_RESPONSE);
    });
    expect(result.current.data?.partial_failure).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('calls FundRecoveryService.execute with correct params', async () => {
    mockExecute.mockResolvedValue(SAMPLE_SUCCESS_RESPONSE);

    const { result } = renderHook(() => useFundRecoveryExecute(), {
      wrapper: createWrapper(),
    });

    const executeRequest = {
      mnemonic: SAMPLE_MNEMONIC,
      destination_address: SAMPLE_DESTINATION,
    };

    act(() => {
      result.current.mutate(executeRequest);
    });

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith(executeRequest);
    });
  });

  it('surfaces the error when execute fails', async () => {
    const executeError = new Error('Execution failed');
    mockExecute.mockRejectedValue(executeError);

    const { result } = renderHook(() => useFundRecoveryExecute(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        mnemonic: SAMPLE_MNEMONIC,
        destination_address: SAMPLE_DESTINATION,
      });
    });

    await waitFor(() => {
      expect(result.current.error).toEqual(executeError);
    });
    expect(result.current.data).toBeUndefined();
  });

  it('resets state after reset() is called', async () => {
    mockExecute.mockResolvedValue(SAMPLE_SUCCESS_RESPONSE);

    const { result } = renderHook(() => useFundRecoveryExecute(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        mnemonic: SAMPLE_MNEMONIC,
        destination_address: SAMPLE_DESTINATION,
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(SAMPLE_SUCCESS_RESPONSE);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });
});
