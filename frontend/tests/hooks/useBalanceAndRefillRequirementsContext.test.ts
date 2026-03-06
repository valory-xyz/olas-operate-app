import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { BalancesAndRefillRequirementsProviderContext } from '../../context/BalancesAndRefillRequirementsProvider/BalancesAndRefillRequirementsProvider';
import { useBalanceAndRefillRequirementsContext } from '../../hooks/useBalanceAndRefillRequirementsContext';

describe('useBalanceAndRefillRequirementsContext', () => {
  it('returns the BalancesAndRefillRequirementsProviderContext value', () => {
    const contextValue = { isLoaded: true };
    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        BalancesAndRefillRequirementsProviderContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(
      () => useBalanceAndRefillRequirementsContext(),
      { wrapper },
    );
    expect(result.current).toBe(contextValue);
  });
});
