import { fireEvent, render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { FundingDescription } from '../../../components/ui/FundingDescription';
import { DEFAULT_EOA_ADDRESS } from '../../helpers/factories';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({ providers: [] }));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <img {...props} alt={props.alt as string} />
  ),
}));

jest.mock('react-icons/tb', () => ({
  TbWallet: () => <span data-testid="tb-wallet">wallet</span>,
  TbCopy: () => <span data-testid="tb-copy">copy</span>,
  TbQrcode: () => <span data-testid="tb-qrcode">qr</span>,
}));

const mockCopyToClipboard = jest.fn(() => Promise.resolve());
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
      success: jest.fn(),
    },
  };
});

jest.mock('../../../components/ui', () => ({
  InfoTooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="info-tooltip">{children}</div>
  ),
}));

describe('FundingDescription', () => {
  const defaultProps = {
    chainName: 'Gnosis',
    chainImage: '/chains/gnosis.png',
    address: DEFAULT_EOA_ADDRESS,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the chain name with "Chain" suffix by default', () => {
    render(<FundingDescription {...defaultProps} />);
    expect(screen.getByText('Gnosis Chain')).toBeInTheDocument();
  });

  it('renders the chain name with "Mainnet" suffix when isMainnet is true', () => {
    render(<FundingDescription {...defaultProps} isMainnet />);
    expect(screen.getByText('Gnosis Mainnet')).toBeInTheDocument();
  });

  it('renders the chain image', () => {
    render(<FundingDescription {...defaultProps} />);
    const img = screen.getByAltText('Gnosis');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/chains/gnosis.png');
  });

  it('renders "On" label', () => {
    render(<FundingDescription {...defaultProps} />);
    expect(screen.getByText('On')).toBeInTheDocument();
  });

  it('renders "From" label', () => {
    render(<FundingDescription {...defaultProps} />);
    expect(screen.getByText('From')).toBeInTheDocument();
  });

  it('renders external wallet text', () => {
    render(<FundingDescription {...defaultProps} />);
    expect(screen.getByText('Your external wallet')).toBeInTheDocument();
  });

  it('renders the ExternalWalletTooltip', () => {
    render(<FundingDescription {...defaultProps} />);
    expect(screen.getByTestId('info-tooltip')).toBeInTheDocument();
    expect(
      screen.getByText('This is the wallet you use outside Pearl'),
    ).toBeInTheDocument();
  });

  it('renders the address', () => {
    render(<FundingDescription {...defaultProps} />);
    expect(screen.getByText(DEFAULT_EOA_ADDRESS)).toBeInTheDocument();
  });

  it('renders "To Pearl Wallet" label in CopyAddress', () => {
    render(<FundingDescription {...defaultProps} />);
    expect(screen.getByText('To Pearl Wallet')).toBeInTheDocument();
  });

  it('opens chain confirmation modal when copy is clicked', () => {
    render(<FundingDescription {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy/i }));
    // Clicking Copy triggers onCopied which opens the chain confirmation modal
    expect(
      screen.getByText(`Send funds on ${defaultProps.chainName}`),
    ).toBeInTheDocument();
  });

  it('shows correct chain name suffix in QR modal (Chain)', () => {
    render(<FundingDescription {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Show QR Code/i }));
    expect(
      screen.getByText('Pearl - Gnosis Chain Address'),
    ).toBeInTheDocument();
  });

  it('shows correct chain name suffix in QR modal (Mainnet)', () => {
    render(<FundingDescription {...defaultProps} isMainnet />);
    fireEvent.click(screen.getByRole('button', { name: /Show QR Code/i }));
    expect(
      screen.getByText('Pearl - Gnosis Mainnet Address'),
    ).toBeInTheDocument();
  });

  it('closes the chain confirmation modal when "I Understand" is clicked', () => {
    render(<FundingDescription {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy/i }));
    expect(
      screen.getByText(`Send funds on ${defaultProps.chainName}`),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'I Understand' }));
    expect(
      screen.queryByText(`Send funds on ${defaultProps.chainName}`),
    ).not.toBeInTheDocument();
  });

  it('shows chain warning text in confirmation modal', () => {
    render(<FundingDescription {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy/i }));
    expect(
      screen.getByText(
        /Sending funds on any other network will result in permanent loss/,
      ),
    ).toBeInTheDocument();
  });

  it('renders the chain image in the confirmation modal', () => {
    render(<FundingDescription {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy/i }));
    const images = screen.getAllByAltText('Gnosis');
    // One in the FundingDescription, one in the confirmation modal
    expect(images.length).toBeGreaterThanOrEqual(2);
  });

  it('applies custom style prop', () => {
    const { container } = render(
      <FundingDescription {...defaultProps} style={{ marginTop: 20 }} />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
