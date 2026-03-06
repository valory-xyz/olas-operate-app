import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { ServicesContext } from '../../context/ServicesProvider';
import { useServices } from '../../hooks/useServices';

describe('useServices', () => {
  it('returns the ServicesContext value', () => {
    const contextValue = { services: [], isFetched: true };
    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        ServicesContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(() => useServices(), { wrapper });
    expect(result.current).toBe(contextValue);
  });
});
