import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { OnRampProvider } from '../../context/OnRampProvider';
import { useOnRampContext } from '../../hooks/useOnRampContext';

// ── Module mocks ──────────────────────────────────────────────────────

jest.mock('../../hooks', () => ({
  useElectronApi: () => ({
    ipcRenderer: { on: jest.fn(), removeListener: jest.fn() },
    onRampWindow: { close: jest.fn() },
  }),
  usePageState: () => ({ pageState: 'Setup' }),
  useMasterBalances: () => ({
    getMasterEoaNativeBalanceOf: jest.fn(),
    getMasterSafeNativeBalanceOf: jest.fn(),
  }),
}));

jest.mock('../../utils', () => ({
  delayInSeconds: jest.fn(() => Promise.resolve()),
  parseEther: (v: string) => {
    const num = parseFloat(v);
    return BigInt(Math.round(num * 1e18)).toString();
  },
}));

// ── Tests ─────────────────────────────────────────────────────────────

describe('useOnRampContext', () => {
  it('returns context values when used within OnRampProvider', () => {
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(OnRampProvider, null, children);

    const { result } = renderHook(() => useOnRampContext(), { wrapper });

    expect(result.current.nativeAmountToPay).toBeNull();
    expect(result.current.isBuyCryptoBtnLoading).toBe(false);
    expect(typeof result.current.updateNativeAmountToPay).toBe('function');
    expect(typeof result.current.resetOnRampState).toBe('function');
  });

  it('returns default context values when used without provider (createContext default)', () => {
    // OnRampContext has a default value from createContext, so useContext
    // will never return null/undefined. The `if (!context)` guard in
    // useOnRampContext will never trigger because createContext always
    // provides a value. This test verifies the hook still works.
    const { result } = renderHook(() => useOnRampContext());

    expect(result.current.nativeAmountToPay).toBeNull();
    expect(result.current.networkId).toBeNull();
    expect(typeof result.current.updateNativeAmountToPay).toBe('function');
    expect(typeof result.current.resetOnRampState).toBe('function');
  });

  it('exposes all expected context properties', () => {
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(OnRampProvider, null, children);

    const { result } = renderHook(() => useOnRampContext(), { wrapper });

    const expectedKeys = [
      'nativeAmountToPay',
      'updateNativeAmountToPay',
      'nativeTotalAmountRequired',
      'updateNativeTotalAmountRequired',
      'usdAmountToPay',
      'updateUsdAmountToPay',
      'isBuyCryptoBtnLoading',
      'updateIsBuyCryptoBtnLoading',
      'isOnRampingTransactionSuccessful',
      'isOnRampingStepCompleted',
      'isTransactionSuccessfulButFundsNotReceived',
      'isSwappingFundsStepCompleted',
      'updateIsSwappingStepCompleted',
      'networkId',
      'networkName',
      'cryptoCurrencyCode',
      'selectedChainId',
      'updateNetworkConfig',
      'resetOnRampState',
    ];

    for (const key of expectedKeys) {
      expect(result.current).toHaveProperty(key);
    }
  });
});
