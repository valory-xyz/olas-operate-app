import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UpdateBackupWalletManualScreen } from '../../../../../components/SettingsPage/BackupWallet/UpdateBackupWalletFlow/UpdateBackupWalletManualScreen';
import { SettingsScreenMap } from '../../../../../constants/screen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGoto = jest.fn();
const mockSetNewAddress = jest.fn();
const mockSetSameAddressError = jest.fn();

let mockSameAddressError = false;
let mockCurrentAddress: string | null = null;

jest.mock('../../../../../hooks', () => ({
  useSettings: () => ({ goto: mockGoto }),
  useBackupOwnerStatus: () => ({
    backupOwnerStatus: {
      canonical_backup_owner: mockCurrentAddress,
      all_chains_synced: true,
      any_backup_missing: false,
      chains: [],
      chains_without_safe: [],
    },
  }),
}));

jest.mock(
  '../../../../../components/SettingsPage/BackupWallet/UpdateBackupWalletFlow/UpdateBackupWalletContext',
  () => ({
    useUpdateBackupWallet: () => ({
      setNewAddress: mockSetNewAddress,
      sameAddressError: mockSameAddressError,
      setSameAddressError: mockSetSameAddressError,
    }),
  }),
);

jest.mock('../../../../../components/ui', () => ({
  Alert: (props: { type: string; message: React.ReactNode }) => (
    <div data-testid="alert" data-type={props.type}>
      {props.message}
    </div>
  ),
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
const DIFFERENT = '0x1234567890abcdef1234567890abcdef12345678';

const fillAndSubmit = (address: string) => {
  fireEvent.change(screen.getByPlaceholderText('0x...'), {
    target: { value: address },
  });
  fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UpdateBackupWalletManualScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSameAddressError = false;
    mockCurrentAddress = null;
  });

  it('renders form with Continue button', () => {
    render(<UpdateBackupWalletManualScreen />);
    expect(
      screen.getByText('Provide Existing Backup Wallet'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Continue/i }),
    ).toBeInTheDocument();
  });

  it('Continue button is disabled when address input is empty', () => {
    render(<UpdateBackupWalletManualScreen />);
    const button = screen.getByRole('button', { name: /Continue/i });

    expect(button).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('0x...'), {
      target: { value: '0x123' },
    });
    expect(button).not.toBeDisabled();
  });

  it('Back button navigates to update method screen', () => {
    render(<UpdateBackupWalletManualScreen />);
    fireEvent.click(screen.getByTestId('back'));
    expect(mockGoto).toHaveBeenCalledWith(
      SettingsScreenMap.UpdateBackupWalletMethod,
    );
  });

  it('rejects invalid address', async () => {
    render(<UpdateBackupWalletManualScreen />);
    fillAndSubmit('xyz');
    await waitFor(() =>
      expect(
        screen.getByText('Please input a valid backup wallet address!'),
      ).toBeInTheDocument(),
    );
    expect(mockSetNewAddress).not.toHaveBeenCalled();
  });

  it('rejects same-as-current address', async () => {
    mockCurrentAddress = VALID;
    render(<UpdateBackupWalletManualScreen />);
    fillAndSubmit(VALID);
    await waitFor(() =>
      expect(mockSetSameAddressError).toHaveBeenCalledWith(true),
    );
    expect(mockSetNewAddress).not.toHaveBeenCalled();
    expect(mockGoto).not.toHaveBeenCalled();
  });

  it('accepts different address and navigates to confirm', async () => {
    mockCurrentAddress = VALID;
    render(<UpdateBackupWalletManualScreen />);
    fillAndSubmit(DIFFERENT);
    await waitFor(() => expect(mockSetNewAddress).toHaveBeenCalled());
    expect(mockGoto).toHaveBeenCalledWith(
      SettingsScreenMap.UpdateBackupWalletConfirm,
    );
    expect(mockSetSameAddressError).toHaveBeenCalledWith(false);
  });

  it('renders Wallet Already Linked alert when sameAddressError is true', () => {
    mockSameAddressError = true;
    render(<UpdateBackupWalletManualScreen />);
    expect(screen.getByTestId('alert')).toHaveAttribute('data-type', 'error');
    expect(screen.getByText('Wallet Already Linked')).toBeInTheDocument();
  });
});
