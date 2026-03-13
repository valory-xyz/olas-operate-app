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

// NOTE: The `if (!context)` guard in useOnRampContext (lines 7-9) is
// unreachable because OnRampContext is initialized with a non-null default
// via createContext. Spying on useContext from requireActual does not
// intercept the bundled import, so we skip that branch.

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
    // OnRampContext is initialized with a non-null default via createContext,
    // so useContext always returns a value. The `if (!context)` guard in
    // useOnRampContext is unreachable — it would only trigger if the default
    // were undefined. This test verifies the hook works with the default
    // context values (no wrapping provider needed).
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
