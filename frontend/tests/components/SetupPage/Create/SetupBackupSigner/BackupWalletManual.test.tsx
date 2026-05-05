import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getAddress } from 'ethers/lib/utils';

import { BackupWalletManual } from '../../../../../components/SetupPage/Create/SetupBackupSigner/BackupWalletManual';

jest.mock('../../../../../constants/providers', () => ({}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetBackupSigner = jest.fn();
const mockOpenWeb3AuthModel = jest.fn();

jest.mock('../../../../../hooks/useSetup', () => ({
  useSetup: () => ({ setBackupSigner: mockSetBackupSigner }),
}));

jest.mock(
  '../../../../../components/SetupPage/Create/SetupBackupSigner/useWeb3AuthBackupWallet',
  () => ({
    useWeb3AuthBackupWallet: jest.fn(({ onFinish }: { onFinish?: unknown }) => {
      // Capture the onFinish so we can verify it's wired through if needed.
      (useWeb3AuthMock as unknown as { lastOnFinish?: unknown }).lastOnFinish =
        onFinish;
      return { openWeb3AuthModel: mockOpenWeb3AuthModel };
    }),
  }),
);

const useWeb3AuthMock: { lastOnFinish?: unknown } = {};

// Replace FormFlex (styled antd Form) with the plain antd Form so the form
// state machine actually runs during tests. Anything else from components/ui
// is out of scope for this file.
jest.mock('../../../../../components/ui', () => {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const { Form } = require('antd');
  /* eslint-enable @typescript-eslint/no-var-requires */
  return { FormFlex: Form };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Source-of-truth EIP-55 checksum via ethers — avoids drift from hand-written
// mixed-case strings.
const RAW_LOWER = '0xaa72b201fc49e0837648d5c8a89fced3eab1364f';
const VALID = getAddress(RAW_LOWER);

const submitWith = (address: string) => {
  fireEvent.change(screen.getByPlaceholderText(/0x12345/), {
    target: { value: address, name: 'backup-signer' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BackupWalletManual (setup)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders address input, Continue button, and Web3Auth link', () => {
    render(<BackupWalletManual onFinish={jest.fn()} />);
    expect(screen.getByPlaceholderText(/0x12345/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Continue/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Set Up Wallet with/i }),
    ).toBeInTheDocument();
  });

  it('on valid submit: persists backup signer and calls onFinish with checksummed address', async () => {
    const onFinish = jest.fn().mockResolvedValue(undefined);
    render(<BackupWalletManual onFinish={onFinish} />);

    submitWith(VALID.toLowerCase());

    await waitFor(() => expect(mockSetBackupSigner).toHaveBeenCalledTimes(1));
    expect(mockSetBackupSigner).toHaveBeenCalledWith({
      address: VALID,
      type: 'manual',
    });
    expect(onFinish).toHaveBeenCalledWith(VALID);
  });

  it('does not call onFinish for a malformed address', async () => {
    const onFinish = jest.fn();
    render(<BackupWalletManual onFinish={onFinish} />);

    submitWith('not-an-address');

    // Give the handler a tick to run.
    await new Promise((r) => setTimeout(r, 0));

    expect(onFinish).not.toHaveBeenCalled();
    expect(mockSetBackupSigner).not.toHaveBeenCalled();
  });

  it('does not call onFinish a second time while one is already pending', async () => {
    // Guards against double-submit: antd's `loading` prop disables the button
    // visually, but the real protection is that handleFinish awaits onFinish
    // and wraps the whole thing in isSubmitting state.
    let resolveFinish: () => void = () => {};
    const onFinish = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFinish = resolve;
        }),
    );
    render(<BackupWalletManual onFinish={onFinish} />);

    submitWith(VALID);
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));

    // Click again while pending; should not trigger a second call.
    submitWith(VALID);
    await new Promise((r) => setTimeout(r, 50));
    expect(onFinish).toHaveBeenCalledTimes(1);

    resolveFinish();
  });

  it('clicking the Web3Auth link opens the Web3Auth window', () => {
    render(<BackupWalletManual onFinish={jest.fn()} />);
    fireEvent.click(
      screen.getByRole('button', { name: /Set Up Wallet with/i }),
    );
    expect(mockOpenWeb3AuthModel).toHaveBeenCalled();
  });

  it('wires the same onFinish through to the Web3Auth hook so switching mid-path works', () => {
    const onFinish = jest.fn();
    render(<BackupWalletManual onFinish={onFinish} />);
    expect(useWeb3AuthMock.lastOnFinish).toBe(onFinish);
  });
});
