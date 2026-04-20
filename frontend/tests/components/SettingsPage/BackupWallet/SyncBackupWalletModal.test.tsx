import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SyncBackupWalletModal } from '../../../../components/SettingsPage/BackupWallet/SyncBackupWalletModal';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockSyncBackupOwner = jest.fn();
const mockToggleSupportModal = jest.fn();

jest.mock('../../../../hooks', () => ({
  useSyncBackupOwner: () => ({ mutateAsync: mockSyncBackupOwner }),
}));

jest.mock('../../../../context/SupportModalProvider', () => ({
  useSupportModal: () => ({ toggleSupportModal: mockToggleSupportModal }),
}));

jest.mock('../../../../components/custom-icons', () => ({
  SuccessOutlined: () => <div data-testid="success-icon" />,
  WarningOutlined: () => <div data-testid="warning-icon" />,
}));

jest.mock('../../../../components/ui', () => ({
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
      <div data-testid="modal-description">{props.description}</div>
      {props.action}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SyncBackupWalletModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncBackupOwner.mockReset();
  });

  it('returns null when open is false', () => {
    const { container } = render(
      <SyncBackupWalletModal open={false} onClose={onClose} />,
    );
    expect(container.innerHTML).toBe('');
    expect(mockSyncBackupOwner).not.toHaveBeenCalled();
  });

  it('fires sync mutation on mount when open', async () => {
    mockSyncBackupOwner.mockResolvedValue({});
    render(<SyncBackupWalletModal open onClose={onClose} />);
    await waitFor(() => expect(mockSyncBackupOwner).toHaveBeenCalledTimes(1));
  });

  it('renders In Progress (non-closable) while mutation pending', () => {
    mockSyncBackupOwner.mockReturnValue(new Promise(() => {}));
    render(<SyncBackupWalletModal open onClose={onClose} />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Backup Wallet Sync in Progress',
    );
    expect(screen.getByTestId('modal')).toHaveAttribute(
      'data-closable',
      'false',
    );
  });

  it('renders Success modal after successful sync', async () => {
    mockSyncBackupOwner.mockResolvedValue({});
    render(<SyncBackupWalletModal open onClose={onClose} />);
    await waitFor(() =>
      expect(screen.getByTestId('success-icon')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Backup Wallet Synced!',
    );
  });

  it('renders Failure modal after mutation rejection', async () => {
    mockSyncBackupOwner.mockRejectedValue(new Error('boom'));
    render(<SyncBackupWalletModal open onClose={onClose} />);
    await waitFor(() =>
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Backup Wallet Sync Failed',
    );
  });

  it('retries sync on Try Again click after failure', async () => {
    mockSyncBackupOwner
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({});

    render(<SyncBackupWalletModal open onClose={onClose} />);

    await waitFor(() =>
      expect(screen.getByText('Try Again')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Try Again'));

    await waitFor(() => expect(mockSyncBackupOwner).toHaveBeenCalledTimes(2));
  });

  it('opens support modal on Contact Support click after failure', async () => {
    mockSyncBackupOwner.mockRejectedValue(new Error('boom'));
    render(<SyncBackupWalletModal open onClose={onClose} />);
    await waitFor(() =>
      expect(screen.getByText('Contact Support')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Contact Support'));
    expect(mockToggleSupportModal).toHaveBeenCalled();
  });

  it('calls onClose on Done click after success', async () => {
    mockSyncBackupOwner.mockResolvedValue({});
    render(<SyncBackupWalletModal open onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('Done')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Done'));
    expect(onClose).toHaveBeenCalled();
  });
});
