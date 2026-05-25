import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { usePartialWithdraw } from '../../../../components/AgentWallet/PartialWithdraw/usePartialWithdraw';
import { REACT_QUERY_KEYS } from '../../../../constants';
import { useServices } from '../../../../hooks';
import { ServicesService } from '../../../../service/Services';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeInsufficientGasError,
} from '../../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({ PROVIDERS: {} }));

jest.mock('../../../../hooks', () => ({
  useServices: jest.fn(),
}));

jest.mock('../../../../service/Services', () => ({
  ServicesService: { withdrawSafe: jest.fn() },
}));

const mockUseServices = useServices as jest.Mock;
const mockWithdrawSafe = ServicesService.withdrawSafe as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  const Wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const amounts = {
  gnosis: {
    ['0x0000000000000000000000000000000000000000' as `0x${string}`]: '1',
  },
} as const;

describe('usePartialWithdraw', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({
      selectedService: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
    });
  });

  it('calls ServicesService.withdrawSafe with service config ID and amounts', async () => {
    mockWithdrawSafe.mockResolvedValue({ error: null, message: 'ok' });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePartialWithdraw(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.onPartialWithdraw(amounts);
    });

    expect(mockWithdrawSafe).toHaveBeenCalledWith({
      serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      amounts,
    });
  });

  it('sets isSuccess=true after successful withdrawal', async () => {
    mockWithdrawSafe.mockResolvedValue({ error: null, message: 'ok' });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePartialWithdraw(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.onPartialWithdraw(amounts);
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.isError).toBe(false);
  });

  it('invalidates withdrawable-balance + balance queries on success', async () => {
    mockWithdrawSafe.mockResolvedValue({ error: null, message: 'ok' });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePartialWithdraw(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.onPartialWithdraw(amounts);
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: REACT_QUERY_KEYS.SAFE_WITHDRAWABLE_BALANCE_KEY(
        DEFAULT_SERVICE_CONFIG_ID,
      ),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['balancesAndRefillRequirements'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['allChainBalancesAndRefillRequirements'],
    });
  });

  it('sets isError=true and surfaces INSUFFICIENT_SIGNER_GAS error body', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const errorBody = makeInsufficientGasError();
    mockWithdrawSafe.mockRejectedValue(errorBody);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePartialWithdraw(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.onPartialWithdraw(amounts);
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toEqual(errorBody);
    consoleSpy.mockRestore();
  });

  it('resetMutation clears state for a follow-up attempt', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockWithdrawSafe.mockRejectedValueOnce(new Error('boom'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePartialWithdraw(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.onPartialWithdraw(amounts);
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    act(() => {
      result.current.resetMutation();
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(false);
    });
    expect(result.current.isSuccess).toBe(false);
    consoleSpy.mockRestore();
  });

  it('throws when service_config_id is missing and does NOT call the service', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockUseServices.mockReturnValue({ selectedService: null });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePartialWithdraw(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.onPartialWithdraw(amounts);
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockWithdrawSafe).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
