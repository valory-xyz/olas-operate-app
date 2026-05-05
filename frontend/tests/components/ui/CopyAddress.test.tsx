import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { CopyAddress } from '../../../components/ui/CopyAddress';
import { DEFAULT_EOA_ADDRESS } from '../../helpers/factories';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({ providers: [] }));

const mockCopyToClipboard = jest.fn(() => Promise.resolve());
const mockMessageSuccess = jest.fn();

jest.mock('../../../utils', () => ({
  // @ts-expect-error mock passthrough
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
}));

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    message: {
      ...actual.message,
      success: (...args: unknown[]) => mockMessageSuccess(...args),
    },
  };
});

jest.mock('react-icons/tb', () => ({
  TbCopy: () => <span data-testid="tb-copy">copy</span>,
  TbQrcode: () => <span data-testid="tb-qrcode">qr</span>,
  TbWallet: () => <span data-testid="tb-wallet">wallet</span>,
}));

describe('CopyAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the address text', () => {
    render(<CopyAddress address={DEFAULT_EOA_ADDRESS} />);
    expect(screen.getByText(DEFAULT_EOA_ADDRESS)).toBeInTheDocument();
  });

  it('renders the wallet icon', () => {
    render(<CopyAddress address={DEFAULT_EOA_ADDRESS} />);
    expect(screen.getByTestId('tb-wallet')).toBeInTheDocument();
  });

  it('renders Copy button', () => {
    render(<CopyAddress address={DEFAULT_EOA_ADDRESS} />);
    expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument();
  });

  it('renders Show QR Code button', () => {
    render(<CopyAddress address={DEFAULT_EOA_ADDRESS} />);
    expect(
      screen.getByRole('button', { name: /Show QR Code/i }),
    ).toBeInTheDocument();
  });

  it('copies address and shows success message when Copy is clicked', async () => {
    render(<CopyAddress address={DEFAULT_EOA_ADDRESS} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy/i }));
    expect(mockCopyToClipboard).toHaveBeenCalledWith(DEFAULT_EOA_ADDRESS);
    await waitFor(() => {
      expect(mockMessageSuccess).toHaveBeenCalledWith('Address copied!');
    });
  });

  it('calls onCopied callback when Copy is clicked', async () => {
    const onCopied = jest.fn();
    render(<CopyAddress address={DEFAULT_EOA_ADDRESS} onCopied={onCopied} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy/i }));
    expect(onCopied).toHaveBeenCalledTimes(1);
  });

  it('does not call onCopied if not provided', async () => {
    render(<CopyAddress address={DEFAULT_EOA_ADDRESS} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy/i }));
    await waitFor(() => {
      expect(mockMessageSuccess).toHaveBeenCalledWith('Address copied!');
    });
    // No error should be thrown
  });

  it('renders "to" label when provided', () => {
    render(<CopyAddress address={DEFAULT_EOA_ADDRESS} to="To Pearl Wallet" />);
    expect(screen.getByText('To Pearl Wallet')).toBeInTheDocument();
  });

  it('does not render "to" label when not provided', () => {
    render(<CopyAddress address={DEFAULT_EOA_ADDRESS} />);
    expect(screen.queryByText('To Pearl Wallet')).not.toBeInTheDocument();
  });

  it('opens QR modal when Show QR Code is clicked', () => {
    render(<CopyAddress address={DEFAULT_EOA_ADDRESS} chainName="Gnosis" />);
    fireEvent.click(screen.getByRole('button', { name: /Show QR Code/i }));
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
  });

  it('shows chain name in the QR modal when chainName is provided', () => {
    render(<CopyAddress address={DEFAULT_EOA_ADDRESS} chainName="Gnosis" />);
    fireEvent.click(screen.getByRole('button', { name: /Show QR Code/i }));
    expect(screen.getByText('Pearl - Gnosis Address')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Use this address to send funds from your external wallet on/,
      ),
    ).toBeInTheDocument();
  });

  it('does not show chain-specific text in QR modal when chainName is not provided', () => {
    render(<CopyAddress address={DEFAULT_EOA_ADDRESS} />);
    fireEvent.click(screen.getByRole('button', { name: /Show QR Code/i }));
    expect(screen.queryByText(/Pearl -.*Address/)).not.toBeInTheDocument();
  });

  it('copies address from the QR modal Copy Address button', async () => {
    render(<CopyAddress address={DEFAULT_EOA_ADDRESS} chainName="Gnosis" />);
    fireEvent.click(screen.getByRole('button', { name: /Show QR Code/i }));
    const copyButtons = screen.getAllByRole('button', { name: /Copy/i });
    // There's a "Copy" button and a "Copy Address" button in the modal
    const modalCopyButton = copyButtons.find((btn) =>
      btn.textContent?.includes('Copy Address'),
    );
    expect(modalCopyButton).toBeDefined();
    fireEvent.click(modalCopyButton!);
    expect(mockCopyToClipboard).toHaveBeenCalledWith(DEFAULT_EOA_ADDRESS);
    await waitFor(() => {
      expect(mockMessageSuccess).toHaveBeenCalledWith('Address copied!');
    });
  });
});
