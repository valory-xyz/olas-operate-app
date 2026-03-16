import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { EvmChainIdMap } from '../../constants/chains';
import { MasterWalletContext } from '../../context/MasterWalletProvider';
import { useMasterWalletContext } from '../../hooks/useWallet';
import { makeMasterEoa, makeMasterSafe } from '../helpers/factories';

describe('useMasterWalletContext', () => {
  it('returns the value provided by MasterWalletContext', () => {
    const mockEoa = makeMasterEoa();
    const mockSafe = makeMasterSafe(EvmChainIdMap.Gnosis);
    const mockGetMasterSafeOf = jest.fn();
    const contextValue = {
      masterEoa: mockEoa,
      masterSafes: [mockSafe],
      masterWallets: [mockEoa, mockSafe],
      getMasterSafeOf: mockGetMasterSafeOf,
      isFetched: true,
    };

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        MasterWalletContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(() => useMasterWalletContext(), { wrapper });
    expect(result.current.masterEoa).toBe(mockEoa);
    expect(result.current.masterSafes).toEqual([mockSafe]);
    expect(result.current.getMasterSafeOf).toBe(mockGetMasterSafeOf);
    expect(result.current.isFetched).toBe(true);
  });

  it('returns the default empty context value when no provider wraps it', () => {
    const { result } = renderHook(() => useMasterWalletContext());

    expect(result.current.masterEoa).toBeUndefined();
    expect(result.current.masterSafes).toBeUndefined();
    expect(result.current.masterWallets).toBeUndefined();
    expect(result.current.getMasterSafeOf).toBeUndefined();
  });
});
