import { fireEvent, render, screen } from '@testing-library/react';

import { SelectPasswordResetOption } from '../../../components/AccountRecovery/components/SelectPasswordResetOption';
import { RESET_METHOD } from '../../../components/AccountRecovery/constants';

const mockSelectResetMethodAndProceed = jest.fn();

let mockContextValue: {
  isRecoveryAvailable: boolean;
  selectResetMethodAndProceed: jest.Mock;
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
      selectResetMethodAndProceed: mockSelectResetMethodAndProceed,
    };
  });

  it('renders both SRP and Backup Wallet card titles', () => {
    render(<SelectPasswordResetOption />);
    expect(screen.getByText('Via Secret Recovery Phrase')).toBeInTheDocument();
    expect(screen.getByText('Via Backup Wallet')).toBeInTheDocument();
  });

  it('proceeds with SRP when "Reset via Recovery Phrase" is clicked', () => {
    render(<SelectPasswordResetOption />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset via Recovery Phrase' }),
    );
    expect(mockSelectResetMethodAndProceed).toHaveBeenCalledWith(
      RESET_METHOD.SRP,
    );
  });

  it('proceeds with BackupWallet when "Reset via Backup Wallet" is clicked', () => {
    render(<SelectPasswordResetOption />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset via Backup Wallet' }),
    );
    expect(mockSelectResetMethodAndProceed).toHaveBeenCalledWith(
      RESET_METHOD.BackupWallet,
    );
  });

  it('hides the Backup Wallet CTA when recovery is not available', () => {
    mockContextValue = {
      ...mockContextValue,
      isRecoveryAvailable: false,
    };
    render(<SelectPasswordResetOption />);
    expect(
      screen.getByText('No backup wallet found. Set up a backup wallet first.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reset via Backup Wallet' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the SRP CTA available when recovery is not available', () => {
    mockContextValue = {
      ...mockContextValue,
      isRecoveryAvailable: false,
    };
    render(<SelectPasswordResetOption />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset via Recovery Phrase' }),
    );
    expect(mockSelectResetMethodAndProceed).toHaveBeenCalledWith(
      RESET_METHOD.SRP,
    );
  });
});
