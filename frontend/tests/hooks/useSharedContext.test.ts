import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { SharedContext } from '../../context/SharedProvider/SharedProvider';
import { useSharedContext } from '../../hooks/useSharedContext';

describe('useSharedContext', () => {
  it('returns context value when wrapped in provider', () => {
    const contextValue = { someField: 'test-value' };

    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        SharedContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(() => useSharedContext(), { wrapper });
    expect(result.current).toBe(contextValue);
  });

  it('throws when used outside SharedContext', () => {
    const nullWrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        SharedContext.Provider,
        { value: null as unknown as Record<string, unknown> },
        children,
      );

    expect(() =>
      renderHook(() => useSharedContext(), { wrapper: nullWrapper }),
    ).toThrow('useSharedContext must be used within SharedContext');
  });
});
