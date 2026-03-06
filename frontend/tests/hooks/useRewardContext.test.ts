import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { RewardContext } from '../../context/RewardProvider';
import { useRewardContext } from '../../hooks/useRewardContext';

describe('useRewardContext', () => {
  it('returns the RewardContext value', () => {
    const contextValue = { totalRewards: 100 };
    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        RewardContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(() => useRewardContext(), { wrapper });
    expect(result.current).toBe(contextValue);
  });
});
