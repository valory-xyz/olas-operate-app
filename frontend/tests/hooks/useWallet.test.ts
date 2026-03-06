import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { MasterWalletContext } from '../../context/MasterWalletProvider';
import { useMasterWalletContext } from '../../hooks/useWallet';

describe('useMasterWalletContext', () => {
  it('returns the MasterWalletContext value', () => {
    const contextValue = { masterEoa: null, masterSafes: [] };
    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        MasterWalletContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(() => useMasterWalletContext(), { wrapper });
    expect(result.current).toBe(contextValue);
  });
});
