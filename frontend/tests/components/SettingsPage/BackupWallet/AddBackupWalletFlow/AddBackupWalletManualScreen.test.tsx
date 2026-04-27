import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AddBackupWalletManualScreen } from '../../../../../components/SettingsPage/BackupWallet/AddBackupWalletFlow/AddBackupWalletManualScreen';
import { SettingsScreenMap } from '../../../../../constants/screen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGoto = jest.fn();
const mockApplyBackupOwner = jest.fn();
const mockSetPassword = jest.fn();
const mockResetFlow = jest.fn();
const mockPassword: string | null = 'test-password';

jest.mock('../../../../../hooks', () => ({
  useApplyBackupOwner: () => ({ mutateAsync: mockApplyBackupOwner }),
  useSettings: () => ({ goto: mockGoto }),
}));

jest.mock(
  '../../../../../components/SettingsPage/BackupWallet/AddBackupWalletFlow/AddBackupWalletContext',
  () => ({
    useAddBackupWallet: () => ({
      password: mockPassword,
      setPassword: mockSetPassword,
      resetFlow: mockResetFlow,
    }),
  }),
);

jest.mock(
  '../../../../../components/SettingsPage/BackupWallet/AddBackupWalletFlow/AddBackupWalletResultModal',
  () => ({
    AddBackupWalletResultModal: (props: { status: string }) => (
      <div data-testid="result-modal" data-status={props.status} />
    ),
  }),
);

jest.mock('../../../../../components/ui', () => ({
  BackButton: (props: { onPrev: () => void }) => (
    <button type="button" data-testid="back" onClick={props.onPrev}>
      Back
    </button>
  ),
  cardStyles: {},
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID = '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f';

const fillAndSubmit = (address: string) => {
  fireEvent.change(screen.getByPlaceholderText('0x...'), {
    target: { value: address },
  });
  fireEvent.click(screen.getByRole('button', { name: /Add Backup Wallet/i }));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AddBackupWalletManualScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApplyBackupOwner.mockReset();
  });

  it('renders form with placeholder and submit button', () => {
    render(<AddBackupWalletManualScreen />);
    expect(
      screen.getByText('Provide Existing Backup Wallet'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0x...')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add Backup Wallet/i }),
    ).toBeInTheDocument();
  });

  it('submit button is disabled when address input is empty and enabled when filled', () => {
    render(<AddBackupWalletManualScreen />);
    const button = screen.getByRole('button', { name: /Add Backup Wallet/i });

    expect(button).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('0x...'), {
      target: { value: '0x123' },
    });
    expect(button).not.toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('0x...'), {
      target: { value: '   ' },
    });
    expect(button).toBeDisabled();
  });

  it('Back button navigates to method screen', () => {
    render(<AddBackupWalletManualScreen />);
    fireEvent.click(screen.getByTestId('back'));
    expect(mockGoto).toHaveBeenCalledWith(
      SettingsScreenMap.AddBackupWalletMethod,
    );
  });

  it('rejects invalid address on submit', async () => {
    render(<AddBackupWalletManualScreen />);
    fillAndSubmit('not-an-address');
    await waitFor(() =>
      expect(
        screen.getByText('Please input a valid backup wallet address!'),
      ).toBeInTheDocument(),
    );
    expect(mockApplyBackupOwner).not.toHaveBeenCalled();
  });

  it('calls applyBackupOwner with checksummed valid address and password from context', async () => {
    mockApplyBackupOwner.mockResolvedValue({});
    render(<AddBackupWalletManualScreen />);
    fillAndSubmit(VALID);
    await waitFor(() => expect(mockApplyBackupOwner).toHaveBeenCalled());
    const arg = mockApplyBackupOwner.mock.calls[0][0];
    expect(arg.backup_owner.toLowerCase()).toBe(VALID.toLowerCase());
    expect(arg.password).toBe('test-password');
    expect(mockSetPassword).toHaveBeenCalledWith(null);
  });

  it('shows in_progress status after valid submit', async () => {
    mockApplyBackupOwner.mockReturnValue(new Promise(() => {}));
    render(<AddBackupWalletManualScreen />);
    fillAndSubmit(VALID);
    await waitFor(() =>
      expect(screen.getByTestId('result-modal')).toHaveAttribute(
        'data-status',
        'in_progress',
      ),
    );
  });

  it('shows success status after mutation resolves', async () => {
    mockApplyBackupOwner.mockResolvedValue({});
    render(<AddBackupWalletManualScreen />);
    fillAndSubmit(VALID);
    await waitFor(() =>
      expect(screen.getByTestId('result-modal')).toHaveAttribute(
        'data-status',
        'success',
      ),
    );
  });

  it('shows failure status after mutation rejects', async () => {
    mockApplyBackupOwner.mockRejectedValue(new Error('boom'));
    render(<AddBackupWalletManualScreen />);
    fillAndSubmit(VALID);
    await waitFor(() =>
      expect(screen.getByTestId('result-modal')).toHaveAttribute(
        'data-status',
        'failure',
      ),
    );
  });
});
