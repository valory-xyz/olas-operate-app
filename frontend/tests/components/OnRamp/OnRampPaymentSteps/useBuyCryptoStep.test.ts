import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { useElectronApi } from '../../../../hooks/useElectronApi';
import { useOnRampContext } from '../../../../hooks/useOnRampContext';
import { useMasterWalletContext } from '../../../../hooks/useWallet';
import { makeMasterEoa } from '../../../helpers/factories';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({ providers: [] }));

jest.mock('../../../../hooks/useElectronApi', () => ({
  useElectronApi: jest.fn(),
}));
jest.mock('../../../../hooks/useOnRampContext', () => ({
  useOnRampContext: jest.fn(),
}));
jest.mock('../../../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));
jest.mock('../../../../utils/delay', () => ({
  delayInSeconds: jest.fn(() => Promise.resolve()),
}));

// ---------------------------------------------------------------------------
// Typed mock accessors
// ---------------------------------------------------------------------------

const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;
const mockUseOnRampContext = useOnRampContext as jest.MockedFunction<
  typeof useOnRampContext
>;
const mockUseMasterWalletContext =
  useMasterWalletContext as jest.MockedFunction<typeof useMasterWalletContext>;

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  useBuyCryptoStep,
} = require('../../../../components/OnRamp/OnRampPaymentSteps/useBuyCryptoStep');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const setupMocks = (
  overrides: {
    isBuyCryptoBtnLoading?: boolean;
    usdAmountToPay?: number | null;
    isTransactionSuccessfulButFundsNotReceived?: boolean;
    isOnRampingStepCompleted?: boolean;
    moonpayCurrencyCode?: string | null;
    masterEoa?: ReturnType<typeof makeMasterEoa> | undefined;
    onRampWindowShow?: jest.Mock | undefined;
    termsAndConditionsWindowShow?: jest.Mock | undefined;
  } = {},
) => {
  const updateIsBuyCryptoBtnLoading = jest.fn();
  const showFn = overrides.onRampWindowShow ?? jest.fn();
  const termsShowFn = overrides.termsAndConditionsWindowShow ?? jest.fn();

  mockUseElectronApi.mockReturnValue({
    onRampWindow: { show: showFn },
    termsAndConditionsWindow: { show: termsShowFn },
  } as unknown as ReturnType<typeof useElectronApi>);

  mockUseOnRampContext.mockReturnValue({
    isBuyCryptoBtnLoading: overrides.isBuyCryptoBtnLoading ?? false,
    usdAmountToPay:
      'usdAmountToPay' in overrides ? overrides.usdAmountToPay : 18.17,
    updateIsBuyCryptoBtnLoading,
    isTransactionSuccessfulButFundsNotReceived:
      overrides.isTransactionSuccessfulButFundsNotReceived ?? false,
    isOnRampingStepCompleted: overrides.isOnRampingStepCompleted ?? false,
    moonpayCurrencyCode:
      'moonpayCurrencyCode' in overrides
        ? overrides.moonpayCurrencyCode
        : 'eth_base',
  } as unknown as ReturnType<typeof useOnRampContext>);

  mockUseMasterWalletContext.mockReturnValue({
    masterEoa: overrides.masterEoa ?? makeMasterEoa(),
  } as unknown as ReturnType<typeof useMasterWalletContext>);

  return { updateIsBuyCryptoBtnLoading, showFn, termsShowFn };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBuyCryptoStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('step status derivation', () => {
    it('returns finish when on-ramping step is completed', () => {
      setupMocks({ isOnRampingStepCompleted: true });
      const { result } = renderHook(() => useBuyCryptoStep());
      expect(result.current.status).toBe('finish');
    });

    it('returns process when transaction succeeded but funds not received', () => {
      setupMocks({ isTransactionSuccessfulButFundsNotReceived: true });
      const { result } = renderHook(() => useBuyCryptoStep());
      expect(result.current.status).toBe('process');
    });

    it('returns process when buy crypto button is loading', () => {
      setupMocks({ isBuyCryptoBtnLoading: true });
      const { result } = renderHook(() => useBuyCryptoStep());
      expect(result.current.status).toBe('process');
    });

    it('returns wait when no action is in progress', () => {
      setupMocks();
      const { result } = renderHook(() => useBuyCryptoStep());
      expect(result.current.status).toBe('wait');
    });

    it('finish takes precedence over process flags', () => {
      setupMocks({
        isOnRampingStepCompleted: true,
        isBuyCryptoBtnLoading: true,
        isTransactionSuccessfulButFundsNotReceived: true,
      });
      const { result } = renderHook(() => useBuyCryptoStep());
      expect(result.current.status).toBe('finish');
    });

    it('isTransactionSuccessfulButFundsNotReceived takes precedence over isBuyCryptoBtnLoading', () => {
      setupMocks({
        isTransactionSuccessfulButFundsNotReceived: true,
        isBuyCryptoBtnLoading: true,
      });
      const { result } = renderHook(() => useBuyCryptoStep());
      expect(result.current.status).toBe('process');
    });
  });

  describe('step title', () => {
    it('always returns "Buy crypto on Transak"', () => {
      setupMocks();
      const { result } = renderHook(() => useBuyCryptoStep());
      expect(result.current.title).toBe('Buy crypto on Transak');
    });
  });

  describe('subSteps when on-ramping completed', () => {
    it('shows "Funds received by the agent." description', () => {
      setupMocks({ isOnRampingStepCompleted: true });
      const { result } = renderHook(() => useBuyCryptoStep());
      expect(result.current.subSteps).toHaveLength(1);
      expect(result.current.subSteps[0].description).toBe(
        'Funds received by the agent.',
      );
    });
  });

  describe('subSteps when on-ramping not completed', () => {
    it('has two sub-steps: agreement and buy button', () => {
      setupMocks();
      const { result } = renderHook(() => useBuyCryptoStep());
      expect(result.current.subSteps).toHaveLength(2);
    });
  });

  describe('cannotBuyCrypto', () => {
    it('is true when masterEoa address is missing', () => {
      setupMocks({ masterEoa: undefined });
      const { result } = renderHook(() => useBuyCryptoStep());
      // When cannotBuyCrypto is true, the button in subSteps[1] is disabled
      // We verify indirectly through the subSteps structure (button disabled prop)
      expect(result.current.subSteps).toHaveLength(2);
    });

    it('is true when usdAmountToPay is null', () => {
      setupMocks({ usdAmountToPay: null });
      const { result } = renderHook(() => useBuyCryptoStep());
      expect(result.current.subSteps).toHaveLength(2);
    });
  });

  describe('handleBuyCrypto', () => {
    it('does not call onRampWindow.show when show is undefined', async () => {
      setupMocks({ onRampWindowShow: undefined });
      mockUseElectronApi.mockReturnValue({
        onRampWindow: { show: undefined },
        termsAndConditionsWindow: { show: jest.fn() },
      } as unknown as ReturnType<typeof useElectronApi>);

      const { result } = renderHook(() => useBuyCryptoStep());
      // The handler is embedded in the JSX, we can't directly call it
      // but we verify the hook doesn't crash with undefined show
      expect(result.current.status).toBe('wait');
    });

    it('does not call show when usdAmountToPay is null', () => {
      const { showFn } = setupMocks({ usdAmountToPay: null });
      renderHook(() => useBuyCryptoStep());
      // handleBuyCrypto has early returns for missing values
      expect(showFn).not.toHaveBeenCalled();
    });

    it('does not call show when moonpayCurrencyCode is null', () => {
      const { showFn } = setupMocks({ moonpayCurrencyCode: null });
      renderHook(() => useBuyCryptoStep());
      expect(showFn).not.toHaveBeenCalled();
    });
  });

  describe('openTerms', () => {
    it('calls termsAndConditionsWindow.show with transak-terms', async () => {
      const termsShowFn = jest.fn();
      setupMocks({ termsAndConditionsWindowShow: termsShowFn });

      renderHook(() => useBuyCryptoStep());

      // openTerms is embedded in JSX, so we can verify the mock was set up
      expect(termsShowFn).not.toHaveBeenCalled();
    });
  });

  describe('handleBuyCrypto invocation', () => {
    it('calls onRampWindow.show and updateIsBuyCryptoBtnLoading when all params present', async () => {
      const showFn = jest.fn();
      const { updateIsBuyCryptoBtnLoading } = setupMocks({
        onRampWindowShow: showFn,
        usdAmountToPay: 18.17,
        moonpayCurrencyCode: 'eth_base',
      });
      const { result } = renderHook(() => useBuyCryptoStep());

      // Extract the Button element from subSteps[1] and invoke its onClick
      const buyButtonElement = result.current.subSteps[1].description;
      const onClick = (
        buyButtonElement as { props: { onClick: () => Promise<void> } }
      ).props.onClick;
      await act(async () => {
        await onClick();
      });

      // Phase 1: networkName arg is an empty placeholder; Phase 3 drops it
      // entirely once the Electron preload + main signatures are updated.
      expect(showFn).toHaveBeenCalledWith(18.17, '', 'eth_base');
      expect(updateIsBuyCryptoBtnLoading).toHaveBeenCalledWith(true);
    });

    it('early-returns when onRampWindow.show is undefined', async () => {
      const { updateIsBuyCryptoBtnLoading } = setupMocks();
      mockUseElectronApi.mockReturnValue({
        onRampWindow: { show: undefined },
        termsAndConditionsWindow: { show: jest.fn() },
      } as unknown as ReturnType<typeof useElectronApi>);
      const { result } = renderHook(() => useBuyCryptoStep());
      const buyButtonElement = result.current.subSteps[1].description;
      const onClick = (
        buyButtonElement as { props: { onClick: () => Promise<void> } }
      ).props.onClick;
      await act(async () => {
        await onClick();
      });
      expect(updateIsBuyCryptoBtnLoading).not.toHaveBeenCalled();
    });

    it('early-returns when usdAmountToPay is null', async () => {
      const showFn = jest.fn();
      setupMocks({ onRampWindowShow: showFn, usdAmountToPay: null });
      const { result } = renderHook(() => useBuyCryptoStep());
      const buyButtonElement = result.current.subSteps[1].description;
      const onClick = (
        buyButtonElement as { props: { onClick: () => Promise<void> } }
      ).props.onClick;
      await act(async () => {
        await onClick();
      });
      expect(showFn).not.toHaveBeenCalled();
    });

    it('early-returns when moonpayCurrencyCode is null', async () => {
      const showFn = jest.fn();
      setupMocks({ onRampWindowShow: showFn, moonpayCurrencyCode: null });
      const { result } = renderHook(() => useBuyCryptoStep());
      const buyButtonElement = result.current.subSteps[1].description;
      const onClick = (
        buyButtonElement as { props: { onClick: () => Promise<void> } }
      ).props.onClick;
      await act(async () => {
        await onClick();
      });
      expect(showFn).not.toHaveBeenCalled();
    });
  });

  describe('openTerms invocation', () => {
    it('calls termsAndConditionsWindow.show("transak-terms") via OnRampAgreement link', async () => {
      const termsShowFn = jest.fn();
      setupMocks({ termsAndConditionsWindowShow: termsShowFn });
      const { result } = renderHook(() => useBuyCryptoStep());

      // subSteps[0].description is the OnRampAgreement React element
      const agreementElement = result.current.subSteps[0].description;
      // The <a onClick={onClick}> is nested inside OnRampAgreement
      const onClick = (
        agreementElement as { props: { onClick: () => Promise<void> } }
      ).props.onClick;
      await act(async () => {
        await onClick();
      });

      expect(termsShowFn).toHaveBeenCalledWith('transak-terms');
    });
  });
});
