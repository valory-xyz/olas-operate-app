import { fireEvent, render, screen } from '@testing-library/react';

import { FundRecoveryResultModal } from '../../../../components/SetupPage/FundRecovery/FundRecoveryResultModal';
import { SETUP_SCREEN } from '../../../../constants';
import {
  FundRecoveryExecuteResponse,
} from '../../../../types/FundRecovery';

const mockGoto = jest.fn();
jest.mock('../../../../hooks', () => ({
  useSetup: () => ({ goto: mockGoto }),
}));

const mockToggleSupportModal = jest.fn();
jest.mock('../../../../context/SupportModalProvider', () => ({
  useSupportModal: () => ({ toggleSupportModal: mockToggleSupportModal }),
}));

jest.mock('../../../../components/ui', () => ({
  Modal: ({
    open,
    title,
    description,
    action,
    header,
    closable,
    onCancel,
  }: {
    open: boolean;
    title?: string;
    description?: React.ReactNode;
    action?: React.ReactNode;
    header?: React.ReactNode;
    closable?: boolean;
    onCancel?: () => void;
  }) => {
    if (!open) return null;
    return (
      <div data-testid="modal">
        {header && <div data-testid="modal-header">{header}</div>}
        {title && <h4 data-testid="modal-title">{title}</h4>}
        {description && (
          <div data-testid="modal-description">{description}</div>
        )}
        {action && <div data-testid="modal-action">{action}</div>}
        {closable && onCancel && (
          <button data-testid="modal-close" onClick={onCancel}>
            Close
          </button>
        )}
      </div>
    );
  },
}));

const DESTINATION_ADDRESS = '0x1234567890AbcdEF1234567890aBcdef12345678' as `0x${string}`;

const SUCCESS_RESULT: FundRecoveryExecuteResponse = {
  success: true,
  partial_failure: false,
  total_funds_moved: {
    '100': {
      [DESTINATION_ADDRESS]: {
        ['0x0000000000000000000000000000000000000000' as `0x${string}`]:
          '1000000000000000000',
      },
    },
  },
  errors: [],
};

const PARTIAL_FAILURE_RESULT: FundRecoveryExecuteResponse = {
  success: false,
  partial_failure: true,
  total_funds_moved: {},
  errors: ['Chain 100: transfer failed'],
};

const defaultProps = {
  result: null,
  error: null,
  open: true,
  isExecuting: false,
  onTryAgain: jest.fn(),
  onClose: jest.fn(),
};

describe('FundRecoveryResultModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when isExecuting is true', () => {
    it('renders the "Withdrawal in Progress" modal', () => {
      render(<FundRecoveryResultModal {...defaultProps} isExecuting={true} />);
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText('Withdrawal in Progress')).toBeInTheDocument();
    });

    it('does not render action buttons while executing', () => {
      render(<FundRecoveryResultModal {...defaultProps} isExecuting={true} />);
      expect(
        screen.queryByRole('button', { name: /Done|Try Again|Contact Support/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when result is successful', () => {
    it('renders the "Withdrawal Complete!" modal', () => {
      render(
        <FundRecoveryResultModal
          {...defaultProps}
          result={SUCCESS_RESULT}
          isExecuting={false}
        />,
      );
      expect(screen.getByText('Withdrawal Complete!')).toBeInTheDocument();
    });

    it('renders the Done button', () => {
      render(
        <FundRecoveryResultModal
          {...defaultProps}
          result={SUCCESS_RESULT}
          isExecuting={false}
        />,
      );
      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    });

    it('navigates to Welcome screen when Done is clicked', () => {
      render(
        <FundRecoveryResultModal
          {...defaultProps}
          result={SUCCESS_RESULT}
          isExecuting={false}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.Welcome);
    });
  });

  describe('when there is an error', () => {
    it('renders the "Withdrawal Failed" modal on network error', () => {
      render(
        <FundRecoveryResultModal
          {...defaultProps}
          error={new Error('Network error')}
          isExecuting={false}
        />,
      );
      expect(screen.getByText('Withdrawal Failed')).toBeInTheDocument();
    });

    it('renders the Try Again button', () => {
      render(
        <FundRecoveryResultModal
          {...defaultProps}
          error={new Error('Network error')}
          isExecuting={false}
        />,
      );
      expect(
        screen.getByRole('button', { name: 'Try Again' }),
      ).toBeInTheDocument();
    });

    it('calls onTryAgain when Try Again is clicked', () => {
      const onTryAgain = jest.fn();
      render(
        <FundRecoveryResultModal
          {...defaultProps}
          error={new Error('Network error')}
          isExecuting={false}
          onTryAgain={onTryAgain}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
      expect(onTryAgain).toHaveBeenCalledTimes(1);
    });

    it('calls toggleSupportModal when Contact Support is clicked', () => {
      render(
        <FundRecoveryResultModal
          {...defaultProps}
          error={new Error('Network error')}
          isExecuting={false}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Contact Support' }));
      expect(mockToggleSupportModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('when result is partial failure', () => {
    it('renders the "Withdrawal Failed" modal for partial failure', () => {
      render(
        <FundRecoveryResultModal
          {...defaultProps}
          result={PARTIAL_FAILURE_RESULT}
          isExecuting={false}
        />,
      );
      expect(screen.getByText('Withdrawal Failed')).toBeInTheDocument();
    });

    it('shows partial failure message', () => {
      render(
        <FundRecoveryResultModal
          {...defaultProps}
          result={PARTIAL_FAILURE_RESULT}
          isExecuting={false}
        />,
      );
      expect(
        screen.getByText(/Some funds may have been transferred/i),
      ).toBeInTheDocument();
    });
  });

  describe('when modal is closed (open=false)', () => {
    it('renders nothing when open is false', () => {
      render(
        <FundRecoveryResultModal
          {...defaultProps}
          open={false}
          isExecuting={true}
        />,
      );
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  describe('when result is null and no error', () => {
    it('renders nothing (idle state)', () => {
      render(
        <FundRecoveryResultModal
          {...defaultProps}
          result={null}
          error={null}
          isExecuting={false}
        />,
      );
      // Modal may still render if open=true but content is null
      // The component should return null when not executing and no result/error
      expect(screen.queryByTestId('modal-title')).not.toBeInTheDocument();
    });
  });
});
