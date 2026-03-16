import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { useWithdrawFunds } from '../../../../components/AgentWallet/Withdraw/useWithdrawFunds';
import { useServices } from '../../../../hooks';
import { ServicesService } from '../../../../service/Services';
import { DEFAULT_SERVICE_CONFIG_ID } from '../../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));

jest.mock('../../../../hooks', () => ({
  useServices: jest.fn(),
}));

jest.mock('../../../../service/Services', () => ({
  ServicesService: { withdrawBalance: jest.fn() },
}));

const mockUseServices = useServices as jest.Mock;
const mockWithdrawBalance = ServicesService.withdrawBalance as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useWithdrawFunds (AgentWallet)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({
      selectedService: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
    });
  });

  it('calls ServicesService.withdrawBalance with service config ID', async () => {
    mockWithdrawBalance.mockResolvedValue(undefined);

    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.onWithdrawFunds();
    });

    expect(mockWithdrawBalance).toHaveBeenCalledWith({
      serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
    });
  });

  it('sets isSuccess=true after successful withdrawal', async () => {
    mockWithdrawBalance.mockResolvedValue(undefined);

    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.onWithdrawFunds();
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.isError).toBe(false);
  });

  it('sets isError=true when withdrawal fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockWithdrawBalance.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.onWithdrawFunds();
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    consoleSpy.mockRestore();
  });

  it('throws when service_config_id is missing', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockUseServices.mockReturnValue({ selectedService: null });

    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.onWithdrawFunds();
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockWithdrawBalance).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
