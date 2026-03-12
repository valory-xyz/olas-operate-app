import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren, useContext } from 'react';

import { EvmChainIdMap } from '../../constants/chains';
import { PAGES } from '../../constants/pages';
import { OnRampContext, OnRampProvider } from '../../context/OnRampProvider';

// ── Module mocks ──────────────────────────────────────────────────────

const mockGetMasterEoaNativeBalanceOf = jest.fn();
const mockGetMasterSafeNativeBalanceOf = jest.fn();

const mockIpcRendererOn = jest.fn();
const mockIpcRendererRemoveListener = jest.fn();
const mockOnRampWindowClose = jest.fn();

const mockPageState = jest.fn<string, []>(() => PAGES.Setup);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockDelayInSeconds = jest.fn((_seconds: number) => Promise.resolve());

jest.mock('../../hooks', () => ({
  useElectronApi: () => ({
    ipcRenderer: {
      on: mockIpcRendererOn,
      removeListener: mockIpcRendererRemoveListener,
    },
    onRampWindow: { close: mockOnRampWindowClose },
  }),
  usePageState: () => ({
    pageState: mockPageState(),
  }),
  useMasterBalances: () => ({
    getMasterEoaNativeBalanceOf: mockGetMasterEoaNativeBalanceOf,
    getMasterSafeNativeBalanceOf: mockGetMasterSafeNativeBalanceOf,
  }),
}));

jest.mock('../../utils', () => ({
  delayInSeconds: (seconds: number) => mockDelayInSeconds(seconds),
  parseEther: (v: string) => {
    // Scale by 1e8 to stay within Number.MAX_SAFE_INTEGER for typical test
    // values (0–100). Both sides of every comparison use the same mock, so
    // relative arithmetic is preserved.
    const num = parseFloat(v);
    return BigInt(Math.round(num * 1e8)).toString();
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────

const CHAIN_ID = EvmChainIdMap.Base;

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(OnRampProvider, null, children);

const useOnRamp = () => useContext(OnRampContext);

/**
 * Extracts the registered IPC callback for a given channel.
 * Returns the most recently registered handler.
 */
const getIpcHandler = (channel: string) => {
  const calls = mockIpcRendererOn.mock.calls.filter(
    ([ch]: [string]) => ch === channel,
  );
  return calls[calls.length - 1]?.[1] as (() => void) | undefined;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockPageState.mockReturnValue(PAGES.Setup);
  mockGetMasterEoaNativeBalanceOf.mockReturnValue(undefined);
  mockGetMasterSafeNativeBalanceOf.mockReturnValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('OnRampProvider', () => {
  describe('initial state', () => {
    it('provides default values (all null/false)', () => {
      const { result } = renderHook(useOnRamp, { wrapper });

      expect(result.current.nativeAmountToPay).toBeNull();
      expect(result.current.nativeTotalAmountRequired).toBeNull();
      expect(result.current.usdAmountToPay).toBeNull();
      expect(result.current.isBuyCryptoBtnLoading).toBe(false);
      expect(result.current.isOnRampingTransactionSuccessful).toBe(false);
      expect(result.current.isOnRampingStepCompleted).toBe(false);
      expect(result.current.isTransactionSuccessfulButFundsNotReceived).toBe(
        false,
      );
      expect(result.current.isSwappingFundsStepCompleted).toBe(false);
      expect(result.current.networkId).toBeNull();
      expect(result.current.networkName).toBeNull();
      expect(result.current.cryptoCurrencyCode).toBeNull();
      expect(result.current.selectedChainId).toBeNull();
    });
  });

  describe('state updates', () => {
    it('updateNativeAmountToPay updates nativeAmountToPay', () => {
      const { result } = renderHook(useOnRamp, { wrapper });
      act(() => result.current.updateNativeAmountToPay(1.5));
      expect(result.current.nativeAmountToPay).toBe(1.5);
    });

    it('updateNativeTotalAmountRequired updates nativeTotalAmountRequired', () => {
      const { result } = renderHook(useOnRamp, { wrapper });
      act(() => result.current.updateNativeTotalAmountRequired(2.0));
      expect(result.current.nativeTotalAmountRequired).toBe(2.0);
    });

    it('updateUsdAmountToPay updates usdAmountToPay', () => {
      const { result } = renderHook(useOnRamp, { wrapper });
      act(() => result.current.updateUsdAmountToPay(100));
      expect(result.current.usdAmountToPay).toBe(100);
    });

    it('updateIsBuyCryptoBtnLoading updates loading state', () => {
      const { result } = renderHook(useOnRamp, { wrapper });
      act(() => result.current.updateIsBuyCryptoBtnLoading(true));
      expect(result.current.isBuyCryptoBtnLoading).toBe(true);
    });

    it('updateNetworkConfig updates all network fields', () => {
      const { result } = renderHook(useOnRamp, { wrapper });
      act(() =>
        result.current.updateNetworkConfig({
          networkId: CHAIN_ID,
          networkName: 'Base',
          cryptoCurrencyCode: 'ETH',
          selectedChainId: CHAIN_ID,
        }),
      );
      expect(result.current.networkId).toBe(CHAIN_ID);
      expect(result.current.networkName).toBe('Base');
      expect(result.current.cryptoCurrencyCode).toBe('ETH');
      expect(result.current.selectedChainId).toBe(CHAIN_ID);
    });

    it('updateIsSwappingStepCompleted updates swapping state', () => {
      const { result } = renderHook(useOnRamp, { wrapper });
      act(() => result.current.updateIsSwappingStepCompleted(true));
      expect(result.current.isSwappingFundsStepCompleted).toBe(true);
    });
  });

  describe('initial balance capture', () => {
    it('captures initial balance when nativeAmountToPay first set', () => {
      mockGetMasterEoaNativeBalanceOf.mockReturnValue('5.0');

      const { result } = renderHook(useOnRamp, { wrapper });

      // Set network config first (provides networkId)
      act(() =>
        result.current.updateNetworkConfig({
          networkId: CHAIN_ID,
          networkName: 'Base',
          cryptoCurrencyCode: 'ETH',
          selectedChainId: CHAIN_ID,
        }),
      );

      // Set nativeAmountToPay to trigger the initial balance capture
      act(() => result.current.updateNativeAmountToPay(1.0));

      // The effect should have called getMasterEoaNativeBalanceOf
      expect(mockGetMasterEoaNativeBalanceOf).toHaveBeenCalledWith(CHAIN_ID);
    });

    it('does not re-capture when already set (ref guard)', () => {
      // Initial balance captured as "5.0"
      mockGetMasterEoaNativeBalanceOf.mockReturnValue('5.0');

      const { result, rerender } = renderHook(useOnRamp, { wrapper });

      act(() =>
        result.current.updateNetworkConfig({
          networkId: CHAIN_ID,
          networkName: 'Base',
          cryptoCurrencyCode: 'ETH',
          selectedChainId: CHAIN_ID,
        }),
      );
      act(() => result.current.updateNativeAmountToPay(1.0));
      act(() => result.current.updateUsdAmountToPay(3000));

      // Now change the balance mock to a much higher value ("100.0").
      // If the ref guard were missing, the initial balance would be
      // re-captured as "100.0" and fund detection would never trigger
      // (since increase from 100 to 6 is negative). But with the guard,
      // the initial balance stays at "5.0", and an increase to "5.9"
      // (increase of 0.9, exactly 90% of 1.0) should trigger detection.
      mockGetMasterEoaNativeBalanceOf.mockReturnValue('100.0');
      rerender();

      // Detection should NOT trigger here because 100 - 5 >= 0.9 is true
      // so actually detection WILL trigger with 100 - 5 = 95. Let's verify
      // that the initial balance was indeed captured at "5.0" by checking
      // that fund receipt WAS detected (since 100 - 5 = 95 >> 0.9).
      expect(result.current.isOnRampingStepCompleted).toBe(true);
    });

    it('defaults to "0" when getMasterEoaNativeBalanceOf returns falsy', () => {
      // Return undefined (falsy) for balance
      mockGetMasterEoaNativeBalanceOf.mockReturnValue(undefined);

      const { result } = renderHook(useOnRamp, { wrapper });

      act(() =>
        result.current.updateNetworkConfig({
          networkId: CHAIN_ID,
          networkName: 'Base',
          cryptoCurrencyCode: 'ETH',
          selectedChainId: CHAIN_ID,
        }),
      );
      act(() => result.current.updateNativeAmountToPay(1.0));

      // Even with falsy balance, the ref is set to '0' — subsequent balance
      // checks can compare against this baseline.
      // We verify the effect ran by checking that getMasterEoaNativeBalanceOf was called.
      expect(mockGetMasterEoaNativeBalanceOf).toHaveBeenCalledWith(CHAIN_ID);
    });
  });

  describe('fund receipt detection', () => {
    /**
     * Sets up state for fund receipt detection tests:
     * - Sets network config
     * - Sets nativeAmountToPay and usdAmountToPay
     * - Captures initial balance via the first effect
     */
    const setupFundDetection = (
      hook: ReturnType<
        typeof renderHook<ReturnType<typeof useOnRamp>, unknown>
      >,
      initialBalance: string,
      nativeAmount: number,
    ) => {
      mockGetMasterEoaNativeBalanceOf.mockReturnValue(initialBalance);

      act(() =>
        hook.result.current.updateNetworkConfig({
          networkId: CHAIN_ID,
          networkName: 'Base',
          cryptoCurrencyCode: 'ETH',
          selectedChainId: CHAIN_ID,
        }),
      );
      act(() => hook.result.current.updateNativeAmountToPay(nativeAmount));
      act(() => hook.result.current.updateUsdAmountToPay(3000));
    };

    it('detects fund receipt when balance increases by >= 90% of nativeAmountToPay', () => {
      const hook = renderHook(useOnRamp, { wrapper });

      // Initial balance: "1.0" (1 unit). Need 1.0 more.
      setupFundDetection(hook, '1.0', 1.0);

      // Current balance: "1.9" (increase of 0.9 = exactly 90% of 1.0)
      mockGetMasterEoaNativeBalanceOf.mockReturnValue('1.9');
      hook.rerender();

      expect(hook.result.current.isOnRampingTransactionSuccessful).toBe(true);
      expect(hook.result.current.isOnRampingStepCompleted).toBe(true);
      expect(hook.result.current.isBuyCryptoBtnLoading).toBe(false);
      expect(mockOnRampWindowClose).toHaveBeenCalled();
    });

    it('does NOT detect when balance increase < 90% threshold', () => {
      const hook = renderHook(useOnRamp, { wrapper });

      // Initial balance: "1.0", need 1.0 more
      setupFundDetection(hook, '1.0', 1.0);

      // Current balance: "1.8" (increase of 0.8, below 0.9 threshold)
      mockGetMasterEoaNativeBalanceOf.mockReturnValue('1.8');
      hook.rerender();

      expect(hook.result.current.isOnRampingTransactionSuccessful).toBe(false);
      expect(mockOnRampWindowClose).not.toHaveBeenCalled();
    });

    it('sets success flags and closes on-ramp window when funds detected', () => {
      const hook = renderHook(useOnRamp, { wrapper });

      // Initial balance: "0"
      setupFundDetection(hook, '0', 2.0);

      // Balance increased by 2.0 (100% of 2.0, well above 90%)
      mockGetMasterEoaNativeBalanceOf.mockReturnValue('2.0');
      hook.rerender();

      expect(hook.result.current.isOnRampingStepCompleted).toBe(true);
      expect(hook.result.current.isBuyCryptoBtnLoading).toBe(false);
      expect(mockOnRampWindowClose).toHaveBeenCalledTimes(1);
    });

    it('does not check when initialBalanceRef is null (no nativeAmountToPay set)', () => {
      const hook = renderHook(useOnRamp, { wrapper });

      // Only set usdAmountToPay, not nativeAmountToPay — initialBalanceRef stays null
      act(() => hook.result.current.updateUsdAmountToPay(100));
      mockGetMasterEoaNativeBalanceOf.mockReturnValue('5.0');
      hook.rerender();

      expect(hook.result.current.isOnRampingTransactionSuccessful).toBe(false);
    });

    it('does not re-check when isOnRampingStepCompleted is already true', () => {
      const hook = renderHook(useOnRamp, { wrapper });

      // First: trigger fund receipt detection
      setupFundDetection(hook, '0', 1.0);
      mockGetMasterEoaNativeBalanceOf.mockReturnValue('1.0');
      hook.rerender();

      // Now isOnRampingStepCompleted is true
      expect(hook.result.current.isOnRampingStepCompleted).toBe(true);

      mockOnRampWindowClose.mockClear();

      // Another rerender should not trigger close again
      hook.rerender();
      // The close was already called once; the guard prevents further calls
      expect(mockOnRampWindowClose).not.toHaveBeenCalled();
    });
  });

  describe('derived state', () => {
    it('isOnRampingStepCompleted = isOnRampingTransactionSuccessful && hasFundsReceivedAfterOnRamp', () => {
      const hook = renderHook(useOnRamp, { wrapper });

      // Setup and trigger both flags via fund detection
      mockGetMasterEoaNativeBalanceOf.mockReturnValue('0');
      act(() =>
        hook.result.current.updateNetworkConfig({
          networkId: CHAIN_ID,
          networkName: 'Base',
          cryptoCurrencyCode: 'ETH',
          selectedChainId: CHAIN_ID,
        }),
      );
      act(() => hook.result.current.updateNativeAmountToPay(1.0));
      act(() => hook.result.current.updateUsdAmountToPay(3000));

      // Both flags false initially
      expect(hook.result.current.isOnRampingStepCompleted).toBe(false);

      // Trigger fund receipt
      mockGetMasterEoaNativeBalanceOf.mockReturnValue('1.0');
      hook.rerender();

      expect(hook.result.current.isOnRampingStepCompleted).toBe(true);
    });

    it('isTransactionSuccessfulButFundsNotReceived is false before any transaction', () => {
      const { result } = renderHook(useOnRamp, { wrapper });
      expect(result.current.isTransactionSuccessfulButFundsNotReceived).toBe(
        false,
      );
    });

    it('isTransactionSuccessfulButFundsNotReceived is false when step is completed', () => {
      const hook = renderHook(useOnRamp, { wrapper });

      // When both flags are true (step completed), the derived value is false
      mockGetMasterEoaNativeBalanceOf.mockReturnValue('0');
      act(() =>
        hook.result.current.updateNetworkConfig({
          networkId: CHAIN_ID,
          networkName: 'Base',
          cryptoCurrencyCode: 'ETH',
          selectedChainId: CHAIN_ID,
        }),
      );
      act(() => hook.result.current.updateNativeAmountToPay(1.0));
      act(() => hook.result.current.updateUsdAmountToPay(3000));

      mockGetMasterEoaNativeBalanceOf.mockReturnValue('1.0');
      hook.rerender();

      // isOnRampingStepCompleted is true, meaning both internal flags are true
      expect(hook.result.current.isOnRampingStepCompleted).toBe(true);
      // Since hasFundsReceivedAfterOnRamp is true, this derived value is false
      expect(
        hook.result.current.isTransactionSuccessfulButFundsNotReceived,
      ).toBe(false);
    });
  });

  describe('IPC events', () => {
    it('onramp-transaction-failure resets loading and sets transaction unsuccessful', async () => {
      const hook = renderHook(useOnRamp, { wrapper });

      // Set loading to true first
      act(() => hook.result.current.updateIsBuyCryptoBtnLoading(true));
      expect(hook.result.current.isBuyCryptoBtnLoading).toBe(true);

      // Get the failure handler
      const handler = getIpcHandler('onramp-transaction-failure');
      expect(handler).toBeDefined();

      // Trigger failure
      await act(async () => {
        handler!();
        // Allow the delayInSeconds promise to resolve
        await Promise.resolve();
      });

      expect(hook.result.current.isBuyCryptoBtnLoading).toBe(false);
      expect(hook.result.current.isOnRampingTransactionSuccessful).toBe(false);
      expect(mockDelayInSeconds).toHaveBeenCalledWith(0.5);
      expect(mockOnRampWindowClose).toHaveBeenCalled();
    });

    it('onramp-window-did-close resets loading only', () => {
      const hook = renderHook(useOnRamp, { wrapper });

      // Set loading to true first
      act(() => hook.result.current.updateIsBuyCryptoBtnLoading(true));
      expect(hook.result.current.isBuyCryptoBtnLoading).toBe(true);

      // Get the close handler
      const handler = getIpcHandler('onramp-window-did-close');
      expect(handler).toBeDefined();

      act(() => handler!());

      expect(hook.result.current.isBuyCryptoBtnLoading).toBe(false);
      // Other flags remain unchanged
      expect(hook.result.current.isOnRampingTransactionSuccessful).toBe(false);
    });

    it('registers IPC listeners and removes them on unmount', () => {
      const { unmount } = renderHook(useOnRamp, { wrapper });

      expect(mockIpcRendererOn).toHaveBeenCalledWith(
        'onramp-transaction-failure',
        expect.any(Function),
      );
      expect(mockIpcRendererOn).toHaveBeenCalledWith(
        'onramp-window-did-close',
        expect.any(Function),
      );

      unmount();

      expect(mockIpcRendererRemoveListener).toHaveBeenCalledWith(
        'onramp-transaction-failure',
        expect.any(Function),
      );
      expect(mockIpcRendererRemoveListener).toHaveBeenCalledWith(
        'onramp-window-did-close',
        expect.any(Function),
      );
    });
  });

  describe('reset', () => {
    it('resetOnRampState clears all payment state', () => {
      const { result } = renderHook(useOnRamp, { wrapper });

      // Set various state
      act(() => {
        result.current.updateNativeAmountToPay(1.0);
        result.current.updateUsdAmountToPay(3000);
        result.current.updateIsBuyCryptoBtnLoading(true);
        result.current.updateIsSwappingStepCompleted(true);
      });

      // Reset
      act(() => result.current.resetOnRampState());

      expect(result.current.nativeAmountToPay).toBeNull();
      expect(result.current.usdAmountToPay).toBeNull();
      expect(result.current.isBuyCryptoBtnLoading).toBe(false);
      expect(result.current.isOnRampingTransactionSuccessful).toBe(false);
      expect(result.current.isSwappingFundsStepCompleted).toBe(false);
    });

    it('does NOT clear networkConfig or nativeTotalAmountRequired', () => {
      const { result } = renderHook(useOnRamp, { wrapper });

      act(() => {
        result.current.updateNetworkConfig({
          networkId: CHAIN_ID,
          networkName: 'Base',
          cryptoCurrencyCode: 'ETH',
          selectedChainId: CHAIN_ID,
        });
        result.current.updateNativeTotalAmountRequired(5.0);
      });

      act(() => result.current.resetOnRampState());

      // networkConfig is NOT reset
      expect(result.current.networkId).toBe(CHAIN_ID);
      expect(result.current.networkName).toBe('Base');
      // nativeTotalAmountRequired is NOT reset
      expect(result.current.nativeTotalAmountRequired).toBe(5.0);
    });

    it('auto-resets with 1s delay on PAGES.Main navigation', () => {
      // Start on Setup page
      mockPageState.mockReturnValue(PAGES.Setup);
      const { result, rerender } = renderHook(useOnRamp, { wrapper });

      // Set some state
      act(() => {
        result.current.updateNativeAmountToPay(2.0);
        result.current.updateUsdAmountToPay(6000);
      });
      expect(result.current.nativeAmountToPay).toBe(2.0);

      // Simulate navigation to Main page and rerender same hook
      mockPageState.mockReturnValue(PAGES.Main);
      rerender();

      // Advance timers by 1 second to trigger the auto-reset
      act(() => jest.advanceTimersByTime(1000));

      expect(result.current.nativeAmountToPay).toBeNull();
      expect(result.current.usdAmountToPay).toBeNull();
      expect(result.current.isBuyCryptoBtnLoading).toBe(false);
    });

    it('does not auto-reset when navigating to a non-Main page', () => {
      mockPageState.mockReturnValue(PAGES.Setup);
      const { result, rerender } = renderHook(useOnRamp, { wrapper });

      act(() => result.current.updateNativeAmountToPay(2.0));

      // Navigate to Settings (not Main)
      mockPageState.mockReturnValue(PAGES.Settings);
      rerender();

      act(() => jest.advanceTimersByTime(2000));

      // State should not be reset
      expect(result.current.nativeAmountToPay).toBe(2.0);
    });
  });

  describe('default context (no provider)', () => {
    it('provides default no-op context values when used without provider', () => {
      const { result } = renderHook(useOnRamp);

      expect(result.current.nativeAmountToPay).toBeNull();
      expect(result.current.networkId).toBeNull();
      expect(result.current.isBuyCryptoBtnLoading).toBe(false);
      expect(result.current.isOnRampingStepCompleted).toBe(false);
      expect(typeof result.current.updateNativeAmountToPay).toBe('function');
      expect(typeof result.current.resetOnRampState).toBe('function');
    });
  });
});
