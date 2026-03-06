import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { BalanceContext } from '../../context/BalanceProvider/BalanceProvider';
import { useBalanceContext } from '../../hooks/useBalanceContext';

describe('useBalanceContext', () => {
  it('returns the BalanceContext value', () => {
    const contextValue = { isLoaded: true, totalEthBalance: 0n };
    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        BalanceContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(() => useBalanceContext(), { wrapper });
    expect(result.current).toBe(contextValue);
  });
});
