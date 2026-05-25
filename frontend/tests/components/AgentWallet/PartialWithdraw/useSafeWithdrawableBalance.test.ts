import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { useSafeWithdrawableBalance } from '../../../../components/AgentWallet/PartialWithdraw/useSafeWithdrawableBalance';
import { useServices } from '../../../../hooks';
import { ServicesService } from '../../../../service/Services';
import { DEFAULT_SERVICE_CONFIG_ID } from '../../../helpers/factories';

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
  ServicesService: { getSafeWithdrawableBalance: jest.fn() },
}));

const mockUseServices = useServices as jest.Mock;
const mockGetBalance = ServicesService.getSafeWithdrawableBalance as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

const apiResponse = {
  gnosis: {
    withdrawable_amounts: {
      '0x0000000000000000000000000000000000000000': '1000000000000000000',
    },
    gas_reserve: '750000000000000000',
  },
};

describe('useSafeWithdrawableBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({
      selectedService: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
    });
  });

  it('fetches the withdrawable balance for the selected service', async () => {
    mockGetBalance.mockResolvedValue(apiResponse);

    const { result } = renderHook(() => useSafeWithdrawableBalance(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockGetBalance).toHaveBeenCalledWith({
      serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
    });
    expect(result.current.data).toEqual(apiResponse);
  });

  it('exposes refetch so consumers can wire a "Retry" CTA', async () => {
    mockGetBalance.mockResolvedValue(apiResponse);

    const { result } = renderHook(() => useSafeWithdrawableBalance(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');

    mockGetBalance.mockClear();
    await result.current.refetch();
    expect(mockGetBalance).toHaveBeenCalledTimes(1);
  });

  it('sets isError=true when the GET fails', async () => {
    mockGetBalance.mockRejectedValue(new Error('Network'));

    const { result } = renderHook(() => useSafeWithdrawableBalance(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.data).toBeUndefined();
  });

  it('does not fetch when service_config_id is missing', async () => {
    mockUseServices.mockReturnValue({ selectedService: null });
    mockGetBalance.mockResolvedValue(apiResponse);

    renderHook(() => useSafeWithdrawableBalance(), {
      wrapper: createWrapper(),
    });

    // Let any micro-tasks settle; the query is disabled so the fetcher
    // must never run.
    await waitFor(() => {
      expect(mockGetBalance).not.toHaveBeenCalled();
    });
  });
});
