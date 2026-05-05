import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { ElectronApiContext } from '../../context/ElectronApiProvider';
import { useElectronApi } from '../../hooks/useElectronApi';

describe('useElectronApi', () => {
  it('returns the value provided by ElectronApiContext', () => {
    const mockCloseApp = jest.fn();
    const mockMinimizeApp = jest.fn();
    const contextValue = {
      closeApp: mockCloseApp,
      minimizeApp: mockMinimizeApp,
    };

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        ElectronApiContext.Provider,
        { value: contextValue },
        children,
      );

    const { result } = renderHook(() => useElectronApi(), { wrapper });

    expect(result.current.closeApp).toBe(mockCloseApp);
    expect(result.current.minimizeApp).toBe(mockMinimizeApp);
  });

  it('returns the default context value when no provider wraps it', () => {
    const { result } = renderHook(() => useElectronApi());

    // Default context has function stubs
    expect(result.current.closeApp).toBeDefined();
    expect(typeof result.current.closeApp).toBe('function');
  });
});
