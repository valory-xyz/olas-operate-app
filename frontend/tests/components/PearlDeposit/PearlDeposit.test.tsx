import { render } from '@testing-library/react';
import { act, createElement } from 'react';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({ providers: [] }));

let depositProps: Record<string, unknown> = {};
let selectPaymentMethodProps: Record<string, unknown> = {};

jest.mock('../../../components/PearlDeposit/Deposit/Deposit', () => ({
  Deposit: (props: Record<string, unknown>) => {
    depositProps = props;
    return createElement('div', { 'data-testid': 'deposit' });
  },
}));

jest.mock(
  '../../../components/PearlDeposit/SelectPaymentMethod/SelectPaymentMethod',
  () => ({
    SelectPaymentMethod: (props: Record<string, unknown>) => {
      selectPaymentMethodProps = props;
      return createElement('div', { 'data-testid': 'select-payment-method' });
    },
  }),
);

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PearlDeposit } = require('../../../components/PearlDeposit/index');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockOnBack = jest.fn();

const renderPearlDeposit = () =>
  render(createElement(PearlDeposit, { onBack: mockOnBack }));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PearlDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    depositProps = {};
    selectPaymentMethodProps = {};
  });

  describe('initial state (DEPOSIT step)', () => {
    it('renders Deposit component initially', () => {
      const { getByTestId, queryByTestId } = renderPearlDeposit();
      expect(getByTestId('deposit')).toBeTruthy();
      expect(queryByTestId('select-payment-method')).toBeNull();
    });

    it('passes onBack to Deposit', () => {
      renderPearlDeposit();
      expect(depositProps.onBack).toBe(mockOnBack);
    });
  });

  describe('step transitions', () => {
    it('transitions to SELECT_PAYMENT_METHOD when onContinue is called', () => {
      const { getByTestId, queryByTestId } = renderPearlDeposit();

      act(() => {
        (depositProps.onContinue as () => void)();
      });

      expect(getByTestId('select-payment-method')).toBeTruthy();
      expect(queryByTestId('deposit')).toBeNull();
    });

    it('transitions back to DEPOSIT when SelectPaymentMethod calls onBack', () => {
      const { getByTestId } = renderPearlDeposit();

      // Go to SELECT_PAYMENT_METHOD
      act(() => {
        (depositProps.onContinue as () => void)();
      });

      expect(getByTestId('select-payment-method')).toBeTruthy();

      // Go back to DEPOSIT
      act(() => {
        (selectPaymentMethodProps.onBack as () => void)();
      });

      expect(getByTestId('deposit')).toBeTruthy();
    });

    it('can cycle between steps multiple times', () => {
      const { getByTestId } = renderPearlDeposit();

      // Forward
      act(() => {
        (depositProps.onContinue as () => void)();
      });
      expect(getByTestId('select-payment-method')).toBeTruthy();

      // Back
      act(() => {
        (selectPaymentMethodProps.onBack as () => void)();
      });
      expect(getByTestId('deposit')).toBeTruthy();

      // Forward again
      act(() => {
        (depositProps.onContinue as () => void)();
      });
      expect(getByTestId('select-payment-method')).toBeTruthy();
    });
  });
});
