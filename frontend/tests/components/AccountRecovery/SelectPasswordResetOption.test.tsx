import { fireEvent, render, screen } from '@testing-library/react';

import { SelectPasswordResetOption } from '../../../components/AccountRecovery/components/SelectPasswordResetOption';
import { RESET_METHOD } from '../../../components/AccountRecovery/constants';

const mockOnNext = jest.fn();
const mockSetSelectedResetMethod = jest.fn();

let mockContextValue: {
  isRecoveryAvailable: boolean;
  setSelectedResetMethod: jest.Mock;
  onNext: jest.Mock;
};

jest.mock(
  '../../../components/AccountRecovery/AccountRecoveryProvider',
  () => ({
    useAccountRecoveryContext: () => mockContextValue,
  }),
);

jest.mock('../../../components/ui', () => ({
  CardFlex: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  IconContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

describe('SelectPasswordResetOption', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue = {
      isRecoveryAvailable: true,
      setSelectedResetMethod: mockSetSelectedResetMethod,
      onNext: mockOnNext,
    };
  });

  it('renders both SRP and Backup Wallet cards', () => {
    render(<SelectPasswordResetOption />);
    expect(screen.getByText('Reset via Recovery Phrase')).toBeInTheDocument();
    expect(screen.getByText('Reset via Backup Wallet')).toBeInTheDocument();
  });

  it('calls setSelectedResetMethod with SRP and onNext when SRP card is clicked', () => {
    render(<SelectPasswordResetOption />);
    const buttons = screen.getAllByRole('button', { name: 'Continue' });
    fireEvent.click(buttons[0]);
    expect(mockSetSelectedResetMethod).toHaveBeenCalledWith(RESET_METHOD.SRP);
    expect(mockOnNext).toHaveBeenCalled();
  });

  it('calls setSelectedResetMethod with BackupWallet and onNext when Backup Wallet card is clicked', () => {
    render(<SelectPasswordResetOption />);
    const buttons = screen.getAllByRole('button', { name: 'Continue' });
    fireEvent.click(buttons[1]);
    expect(mockSetSelectedResetMethod).toHaveBeenCalledWith(
      RESET_METHOD.BackupWallet,
    );
    expect(mockOnNext).toHaveBeenCalled();
  });

  it('shows disabled state for Backup Wallet when recovery is not available', () => {
    mockContextValue = {
      ...mockContextValue,
      isRecoveryAvailable: false,
    };
    render(<SelectPasswordResetOption />);
    expect(screen.getByText('No backup wallet set up.')).toBeInTheDocument();
    // Only the SRP Continue button should exist
    const buttons = screen.getAllByRole('button', { name: 'Continue' });
    expect(buttons).toHaveLength(1);
  });

  it('renders SRP card Continue button when recovery is not available', () => {
    mockContextValue = {
      ...mockContextValue,
      isRecoveryAvailable: false,
    };
    render(<SelectPasswordResetOption />);
    const srpButton = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(srpButton);
    expect(mockSetSelectedResetMethod).toHaveBeenCalledWith(RESET_METHOD.SRP);
    expect(mockOnNext).toHaveBeenCalled();
  });
});
