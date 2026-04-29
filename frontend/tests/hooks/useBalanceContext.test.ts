import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { BalanceContext } from '../../context/BalanceProvider/BalanceProvider';
import { useBalanceContext } from '../../hooks/useBalanceContext';
import { DEFAULT_EOA_ADDRESS } from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({ providers: [] }));

describe('useBalanceContext', () => {
  it('returns the value provided by BalanceContext.Provider', () => {
    const mockUpdateBalances = jest.fn().mockResolvedValue(undefined);
    const mockSetIsPaused = jest.fn();
    const contextValue = {
      isLoading: false,
      isLoaded: true,
      updateBalances: mockUpdateBalances,
      setIsPaused: mockSetIsPaused,
      walletBalances: [],
      totalOlasBalance: 100,
      totalEthBalance: 5,
      totalStakedOlasBalance: 50,
      getStakedOlasBalanceOf: jest.fn().mockReturnValue(25),
      getStakedOlasBalanceByServiceConfigId: jest.fn().mockReturnValue(25),
      isPaused: false,
    };

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(BalanceContext.Provider, { value: contextValue }, children);

    const { result } = renderHook(() => useBalanceContext(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.updateBalances).toBe(mockUpdateBalances);
    expect(result.current.setIsPaused).toBe(mockSetIsPaused);
    expect(result.current.walletBalances).toEqual([]);
    expect(result.current.totalOlasBalance).toBe(100);
    expect(result.current.totalEthBalance).toBe(5);
    expect(result.current.totalStakedOlasBalance).toBe(50);
    expect(result.current.isPaused).toBe(false);
  });

  it('returns default context values when no provider wraps the hook', () => {
    const { result } = renderHook(() => useBalanceContext());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLoaded).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.walletBalances).toBeUndefined();
    expect(result.current.totalOlasBalance).toBeUndefined();
    expect(result.current.totalEthBalance).toBeUndefined();
    expect(result.current.totalStakedOlasBalance).toBeUndefined();
  });

  it('returns getStakedOlasBalanceOf that defaults to 0 when no provider wraps the hook', () => {
    const { result } = renderHook(() => useBalanceContext());
    expect(result.current.getStakedOlasBalanceOf(DEFAULT_EOA_ADDRESS)).toBe(0);
  });

  it('returns getStakedOlasBalanceByServiceConfigId that defaults to 0 when no provider wraps the hook', () => {
    const { result } = renderHook(() => useBalanceContext());
    expect(
      result.current.getStakedOlasBalanceByServiceConfigId('sc-any-id'),
    ).toBe(0);
  });

  it('exposes updateBalances as a callable async function', async () => {
    const mockUpdateBalances = jest.fn().mockResolvedValue(undefined);
    const contextValue = {
      isLoading: false,
      isLoaded: true,
      updateBalances: mockUpdateBalances,
      setIsPaused: jest.fn(),
      getStakedOlasBalanceOf: jest.fn(),
      getStakedOlasBalanceByServiceConfigId: jest.fn(),
      isPaused: false,
    };

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(BalanceContext.Provider, { value: contextValue }, children);

    const { result } = renderHook(() => useBalanceContext(), { wrapper });

    await result.current.updateBalances();
    expect(mockUpdateBalances).toHaveBeenCalledTimes(1);
  });
});
