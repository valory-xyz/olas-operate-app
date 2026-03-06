import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { ElectronApiContext } from '../../context/ElectronApiProvider';
import { useElectronApi } from '../../hooks/useElectronApi';

describe('useElectronApi', () => {
  it('returns the ElectronApiContext value', () => {
    const contextValue = { closeApp: jest.fn(), minimizeApp: jest.fn() };
    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(
        ElectronApiContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(() => useElectronApi(), { wrapper });
    expect(result.current.closeApp).toBe(contextValue.closeApp);
    expect(result.current.minimizeApp).toBe(contextValue.minimizeApp);
  });
});
