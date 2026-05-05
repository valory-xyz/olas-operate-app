import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UpdateBackupWalletResultModal } from '../../../../../components/SettingsPage/BackupWallet/UpdateBackupWalletFlow/UpdateBackupWalletResultModal';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockToggleSupportModal = jest.fn();

jest.mock('../../../../../context/SupportModalProvider', () => ({
  useSupportModal: () => ({ toggleSupportModal: mockToggleSupportModal }),
}));

jest.mock('../../../../../components/custom-icons', () => ({
  SuccessOutlined: () => <div data-testid="success-icon" />,
  WarningOutlined: () => <div data-testid="warning-icon" />,
}));

jest.mock('../../../../../components/ui', () => ({
  LoadingSpinner: () => <div data-testid="spinner" />,
  Modal: (props: {
    title?: string;
    description?: string;
    header?: React.ReactNode;
    action?: React.ReactNode;
    closable?: boolean;
  }) => (
    <div data-testid="modal" data-closable={String(props.closable ?? true)}>
      {props.header}
      <div data-testid="modal-title">{props.title}</div>
      {props.action}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UpdateBackupWalletResultModal', () => {
  const onDone = jest.fn();
  const onRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    onRetry.mockReset();
  });

  it('renders nothing for idle status', () => {
    const { container } = render(
      <UpdateBackupWalletResultModal
        status="idle"
        onDone={onDone}
        onRetry={onRetry}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders spinner + non-closable modal for in_progress', () => {
    render(
      <UpdateBackupWalletResultModal
        status="in_progress"
        onDone={onDone}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Backup Wallet Update in Progress',
    );
    expect(screen.getByTestId('modal')).toHaveAttribute(
      'data-closable',
      'false',
    );
  });

  it('renders success modal with Done button', () => {
    render(
      <UpdateBackupWalletResultModal
        status="success"
        onDone={onDone}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByTestId('success-icon')).toBeInTheDocument();
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Backup Wallet Updated!',
    );
    fireEvent.click(screen.getByRole('button', { name: /Done/i }));
    expect(onDone).toHaveBeenCalled();
  });

  it('renders failure modal with Try Again + Contact Support', () => {
    render(
      <UpdateBackupWalletResultModal
        status="failure"
        onDone={onDone}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Backup Wallet Update Failed',
    );
    expect(
      screen.getByRole('button', { name: /Try Again/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Contact Support/i }),
    ).toBeInTheDocument();
  });

  it('Try Again invokes onRetry and tracks internal status', async () => {
    onRetry.mockResolvedValue(undefined);
    render(
      <UpdateBackupWalletResultModal
        status="failure"
        onDone={onDone}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('modal-title')).toHaveTextContent(
        'Backup Wallet Updated!',
      ),
    );
  });

  it('Try Again shows failure again when retry rejects', async () => {
    onRetry.mockRejectedValue(new Error('boom'));
    render(
      <UpdateBackupWalletResultModal
        status="failure"
        onDone={onDone}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    await waitFor(() => expect(onRetry).toHaveBeenCalled());
    // Should show failure still (not success)
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Backup Wallet Update Failed',
    );
  });

  it('Contact Support opens support modal', () => {
    render(
      <UpdateBackupWalletResultModal
        status="failure"
        onDone={onDone}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Contact Support/i }));
    expect(mockToggleSupportModal).toHaveBeenCalled();
  });
});
