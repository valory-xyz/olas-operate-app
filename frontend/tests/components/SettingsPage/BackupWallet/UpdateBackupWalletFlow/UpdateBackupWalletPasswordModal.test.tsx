import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UpdateBackupWalletPasswordModal } from '../../../../../components/SettingsPage/BackupWallet/UpdateBackupWalletFlow/UpdateBackupWalletPasswordModal';
import { SettingsScreenMap } from '../../../../../constants/screen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGoto = jest.fn();
const mockValidatePassword = jest.fn();
const mockSetPassword = jest.fn();

jest.mock('../../../../../hooks', () => ({
  useSettings: () => ({ goto: mockGoto }),
  useValidatePassword: () => ({
    isLoading: false,
    validatePassword: mockValidatePassword,
  }),
}));

jest.mock(
  '../../../../../components/SettingsPage/BackupWallet/UpdateBackupWalletFlow/UpdateBackupWalletContext',
  () => ({
    useUpdateBackupWallet: () => ({ setPassword: mockSetPassword }),
  }),
);

jest.mock('../../../../../components/ui', () => ({
  Alert: (props: { message: string; type: string }) => (
    <div data-testid="error-alert" data-type={props.type}>
      {props.message}
    </div>
  ),
  Modal: (props: {
    open: boolean;
    title?: string;
    action?: React.ReactNode;
    onCancel?: () => void;
  }) =>
    props.open ? (
      <div data-testid="modal">
        <div>{props.title}</div>
        {props.action}
      </div>
    ) : null,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UpdateBackupWalletPasswordModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatePassword.mockReset();
  });

  it('returns null when closed', () => {
    const { container } = render(
      <UpdateBackupWalletPasswordModal open={false} onClose={onClose} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders title when open', () => {
    render(<UpdateBackupWalletPasswordModal open onClose={onClose} />);
    expect(screen.getByText('Authorize Wallet Update')).toBeInTheDocument();
  });

  it('shows error alert when password is invalid', async () => {
    mockValidatePassword.mockResolvedValue(false);
    render(<UpdateBackupWalletPasswordModal open onClose={onClose} />);

    const input = screen.getByLabelText('Enter password');
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() =>
      expect(screen.getByTestId('error-alert')).toBeInTheDocument(),
    );
    expect(mockGoto).not.toHaveBeenCalled();
    expect(mockSetPassword).not.toHaveBeenCalled();
  });

  it('navigates to method screen on valid password + stores password', async () => {
    mockValidatePassword.mockResolvedValue(true);
    render(<UpdateBackupWalletPasswordModal open onClose={onClose} />);

    const input = screen.getByLabelText('Enter password');
    fireEvent.change(input, { target: { value: 'correct' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() =>
      expect(mockGoto).toHaveBeenCalledWith(
        SettingsScreenMap.UpdateBackupWalletMethod,
      ),
    );
    expect(mockSetPassword).toHaveBeenCalledWith('correct');
    expect(onClose).toHaveBeenCalled();
  });

  it('Cancel button calls onClose', () => {
    render(<UpdateBackupWalletPasswordModal open onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
