import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { StoreContext } from '../../context/StoreProvider';
import { useStore } from '../../hooks/useStore';

describe('useStore', () => {
  it('returns the StoreContext value', () => {
    const storeState = { environmentName: 'production' };
    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        StoreContext.Provider,
        { value: { storeState } },
        children,
      );

    const { result } = renderHook(() => useStore(), { wrapper });
    expect(result.current.storeState).toEqual(storeState);
  });

  it('returns undefined storeState by default', () => {
    const { result } = renderHook(() => useStore());
    expect(result.current.storeState).toBeUndefined();
  });
});
