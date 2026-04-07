import { fireEvent, render, screen } from '@testing-library/react';

import { FundRecoveryScanResults } from '../../../../components/SetupPage/FundRecovery/FundRecoveryScanResults';
import { FundRecoveryScanResponse } from '../../../../types/FundRecovery';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <img {...props} alt={props.alt as string} />
  ),
}));

jest.mock('../../../../components/ui', () => ({
  Alert: ({
    message,
    description,
    type,
  }: {
    message?: string;
    description?: string;
    type?: string;
  }) => (
    <div data-testid="alert" data-type={type}>
      {message && <span>{message}</span>}
      {description && <span>{description}</span>}
    </div>
  ),
}));

// Providers and chains mocks
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({}));

const GNOSIS_CHAIN_ID = 100;
const MASTER_EOA =
  '0x1234567890AbcdEF1234567890aBcdef12345678' as `0x${string}`;
const ADDRESS_ZERO =
  '0x0000000000000000000000000000000000000000' as `0x${string}`;
const VALID_DESTINATION = '0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD';

const scanResultWithBalance: FundRecoveryScanResponse = {
  balances: {
    [String(GNOSIS_CHAIN_ID)]: {
      [MASTER_EOA]: {
        [ADDRESS_ZERO]: '1000000000000000000', // 1 ETH in wei
      },
    },
  },
  services: [],
  gas_warnings: [],
};

const scanResultWithGasWarning: FundRecoveryScanResponse = {
  balances: {
    [String(GNOSIS_CHAIN_ID)]: {
      [MASTER_EOA]: {
        [ADDRESS_ZERO]: '1000000000000000000',
      },
    },
  },
  services: [],
  gas_warnings: [{ chain_id: GNOSIS_CHAIN_ID, message: 'Insufficient gas' }],
};

const scanResultEmpty: FundRecoveryScanResponse = {
  balances: {},
  services: [],
  gas_warnings: [],
};

const defaultProps = {
  scanResult: scanResultWithBalance,
  destinationAddress: '',
  isExecuting: false,
  onDestinationAddressChange: jest.fn(),
  onRecover: jest.fn(),
};

describe('FundRecoveryScanResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial rendering', () => {
    it('renders the title "Withdraw Funds"', () => {
      render(<FundRecoveryScanResults {...defaultProps} />);
      expect(screen.getByText('Withdraw Funds')).toBeInTheDocument();
    });

    it('renders the withdrawal address input', () => {
      render(<FundRecoveryScanResults {...defaultProps} />);
      expect(screen.getByPlaceholderText('0x...')).toBeInTheDocument();
    });

    it('renders the Withdraw button', () => {
      render(<FundRecoveryScanResults {...defaultProps} />);
      expect(
        screen.getByRole('button', { name: 'Withdraw' }),
      ).toBeInTheDocument();
    });
  });

  describe('Withdraw button disabled state', () => {
    it('is disabled when destination address is empty', () => {
      render(
        <FundRecoveryScanResults {...defaultProps} destinationAddress="" />,
      );
      expect(screen.getByRole('button', { name: 'Withdraw' })).toBeDisabled();
    });

    it('is disabled when destination address is invalid', () => {
      render(
        <FundRecoveryScanResults
          {...defaultProps}
          destinationAddress="not-an-address"
        />,
      );
      expect(screen.getByRole('button', { name: 'Withdraw' })).toBeDisabled();
    });

    it('is disabled when there are no balances', () => {
      render(
        <FundRecoveryScanResults
          {...defaultProps}
          scanResult={scanResultEmpty}
          destinationAddress={VALID_DESTINATION}
        />,
      );
      expect(screen.getByRole('button', { name: 'Withdraw' })).toBeDisabled();
    });

    it('is enabled when gas is insufficient (backend skips those chains)', () => {
      render(
        <FundRecoveryScanResults
          {...defaultProps}
          scanResult={scanResultWithGasWarning}
          destinationAddress={VALID_DESTINATION}
        />,
      );
      expect(
        screen.getByRole('button', { name: 'Withdraw' }),
      ).not.toBeDisabled();
    });

    it('is disabled when isExecuting is true', () => {
      render(
        <FundRecoveryScanResults
          {...defaultProps}
          destinationAddress={VALID_DESTINATION}
          isExecuting={true}
        />,
      );
      expect(screen.getByRole('button', { name: /Withdraw/i })).toBeDisabled();
    });

    it('is enabled when address is valid, balances exist, and gas is sufficient', () => {
      render(
        <FundRecoveryScanResults
          {...defaultProps}
          destinationAddress={VALID_DESTINATION}
        />,
      );
      expect(
        screen.getByRole('button', { name: 'Withdraw' }),
      ).not.toBeDisabled();
    });
  });

  describe('empty balances', () => {
    it('shows the "no recoverable balances" alert when balances are empty', () => {
      render(
        <FundRecoveryScanResults
          {...defaultProps}
          scanResult={scanResultEmpty}
        />,
      );
      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(
        screen.getByText(/No recoverable balances found/i),
      ).toBeInTheDocument();
    });
  });

  describe('address validation', () => {
    it('shows an error message for an invalid address after input', () => {
      render(
        <FundRecoveryScanResults
          {...defaultProps}
          destinationAddress="0xinvalid"
        />,
      );
      expect(screen.getByText(/valid EVM address/i)).toBeInTheDocument();
    });

    it('does not show error for empty address', () => {
      render(
        <FundRecoveryScanResults {...defaultProps} destinationAddress="" />,
      );
      expect(screen.queryByText(/valid EVM address/i)).not.toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onDestinationAddressChange when address input changes', () => {
      const onDestinationAddressChange = jest.fn();
      render(
        <FundRecoveryScanResults
          {...defaultProps}
          onDestinationAddressChange={onDestinationAddressChange}
        />,
      );

      fireEvent.change(screen.getByPlaceholderText('0x...'), {
        target: { value: VALID_DESTINATION },
      });

      expect(onDestinationAddressChange).toHaveBeenCalledWith(
        VALID_DESTINATION,
      );
    });

    it('calls onRecover when Withdraw is clicked with valid address', () => {
      const onRecover = jest.fn();
      render(
        <FundRecoveryScanResults
          {...defaultProps}
          destinationAddress={VALID_DESTINATION}
          onRecover={onRecover}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
      expect(onRecover).toHaveBeenCalledTimes(1);
    });
  });
});
