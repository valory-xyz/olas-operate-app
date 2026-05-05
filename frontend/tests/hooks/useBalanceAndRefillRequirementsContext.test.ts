import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { BalancesAndRefillRequirementsProviderContext } from '../../context/BalancesAndRefillRequirementsProvider/BalancesAndRefillRequirementsProvider';
import { useBalanceAndRefillRequirementsContext } from '../../hooks/useBalanceAndRefillRequirementsContext';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({ providers: [] }));

describe('useBalanceAndRefillRequirementsContext', () => {
  it('returns the value provided by BalancesAndRefillRequirementsProviderContext.Provider', () => {
    const mockRefetch = jest.fn().mockResolvedValue([{}, {}]);
    const mockRefetchForSelectedAgent = jest.fn().mockResolvedValue({});
    const mockResetQueryCache = jest.fn();
    const contextValue = {
      isBalancesAndFundingRequirementsLoading: true,
      isBalancesAndFundingRequirementsLoadingForAllServices: false,
      isBalancesAndFundingRequirementsReadyForAllServices: true,
      isBalancesAndFundingRequirementsEnabledForAllServices: true,
      refillRequirements: undefined,
      getRefillRequirementsOf: jest.fn().mockReturnValue(null),
      totalRequirements: undefined,
      agentFundingRequests: undefined,
      canStartAgent: true,
      isRefillRequired: false,
      isAgentFundingRequestsStale: false,
      isPearlWalletRefillRequired: false,
      refetch: mockRefetch,
      refetchForSelectedAgent: mockRefetchForSelectedAgent,
      allowStartAgentByServiceConfigId: jest.fn().mockReturnValue(true),
      hasBalancesForServiceConfigId: jest.fn().mockReturnValue(true),
      resetQueryCache: mockResetQueryCache,
    };

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        BalancesAndRefillRequirementsProviderContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(
      () => useBalanceAndRefillRequirementsContext(),
      { wrapper },
    );

    expect(result.current.isBalancesAndFundingRequirementsLoading).toBe(true);
    expect(
      result.current.isBalancesAndFundingRequirementsLoadingForAllServices,
    ).toBe(false);
    expect(
      result.current.isBalancesAndFundingRequirementsReadyForAllServices,
    ).toBe(true);
    expect(
      result.current.isBalancesAndFundingRequirementsEnabledForAllServices,
    ).toBe(true);
    expect(result.current.canStartAgent).toBe(true);
    expect(result.current.isRefillRequired).toBe(false);
    expect(result.current.isAgentFundingRequestsStale).toBe(false);
    expect(result.current.isPearlWalletRefillRequired).toBe(false);
    expect(result.current.refillRequirements).toBeUndefined();
    expect(result.current.totalRequirements).toBeUndefined();
    expect(result.current.agentFundingRequests).toBeUndefined();
    expect(result.current.refetch).toBe(mockRefetch);
    expect(result.current.refetchForSelectedAgent).toBe(
      mockRefetchForSelectedAgent,
    );
    expect(result.current.resetQueryCache).toBe(mockResetQueryCache);
  });

  it('returns default context values when no provider wraps the hook', () => {
    const { result } = renderHook(() =>
      useBalanceAndRefillRequirementsContext(),
    );

    expect(result.current.isBalancesAndFundingRequirementsLoading).toBe(false);
    expect(
      result.current.isBalancesAndFundingRequirementsLoadingForAllServices,
    ).toBe(false);
    expect(
      result.current.isBalancesAndFundingRequirementsReadyForAllServices,
    ).toBe(false);
    expect(
      result.current.isBalancesAndFundingRequirementsEnabledForAllServices,
    ).toBe(false);
    expect(result.current.canStartAgent).toBe(false);
    expect(result.current.isRefillRequired).toBe(true);
    expect(result.current.isAgentFundingRequestsStale).toBe(false);
    expect(result.current.isPearlWalletRefillRequired).toBe(false);
    expect(result.current.refillRequirements).toBeUndefined();
    expect(result.current.totalRequirements).toBeUndefined();
    expect(result.current.agentFundingRequests).toBeUndefined();
  });

  it('returns default allowStartAgentByServiceConfigId that returns false', () => {
    const { result } = renderHook(() =>
      useBalanceAndRefillRequirementsContext(),
    );

    expect(result.current.allowStartAgentByServiceConfigId('some-id')).toBe(
      false,
    );
    expect(result.current.allowStartAgentByServiceConfigId(undefined)).toBe(
      false,
    );
  });

  it('returns default hasBalancesForServiceConfigId that returns false', () => {
    const { result } = renderHook(() =>
      useBalanceAndRefillRequirementsContext(),
    );

    expect(result.current.hasBalancesForServiceConfigId('some-id')).toBe(false);
    expect(result.current.hasBalancesForServiceConfigId(undefined)).toBe(false);
  });

  it('returns default getRefillRequirementsOf that returns null', () => {
    const { result } = renderHook(() =>
      useBalanceAndRefillRequirementsContext(),
    );

    expect(result.current.getRefillRequirementsOf(100 as never)).toBeNull();
  });

  it('returns default refetch and refetchForSelectedAgent as callable functions', async () => {
    const { result } = renderHook(() =>
      useBalanceAndRefillRequirementsContext(),
    );

    const refetchResult = await result.current.refetch();
    expect(refetchResult).toEqual([{}, {}]);

    const refetchForSelectedResult =
      await result.current.refetchForSelectedAgent();
    expect(refetchForSelectedResult).toEqual({});
  });

  it('returns default resetQueryCache as a callable no-op function', () => {
    const { result } = renderHook(() =>
      useBalanceAndRefillRequirementsContext(),
    );

    expect(() => result.current.resetQueryCache()).not.toThrow();
  });
});
