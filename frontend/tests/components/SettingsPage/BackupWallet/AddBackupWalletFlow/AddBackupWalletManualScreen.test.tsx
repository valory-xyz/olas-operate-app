import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AddBackupWalletManualScreen } from '../../../../../components/SettingsPage/BackupWallet/AddBackupWalletFlow/AddBackupWalletManualScreen';
import { SettingsScreenMap } from '../../../../../constants/screen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGoto = jest.fn();
const mockApplyBackupOwner = jest.fn();

jest.mock('../../../../../hooks', () => ({
  useApplyBackupOwner: () => ({ mutateAsync: mockApplyBackupOwner }),
  useSettings: () => ({ goto: mockGoto }),
}));

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

  it('calls applyBackupOwner with checksummed valid address', async () => {
    mockApplyBackupOwner.mockResolvedValue({});
    render(<AddBackupWalletManualScreen />);
    fillAndSubmit(VALID);
    await waitFor(() => expect(mockApplyBackupOwner).toHaveBeenCalled());
    const arg = mockApplyBackupOwner.mock.calls[0][0];
    expect(arg.backup_owner.toLowerCase()).toBe(VALID.toLowerCase());
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
