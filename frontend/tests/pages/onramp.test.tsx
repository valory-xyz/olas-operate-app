import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/router';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../components/OnRampIframe/OnRampIframe', () => ({
  OnRampIframe: ({
    usdAmountToPay,
    networkName,
    cryptoCurrencyCode,
  }: {
    usdAmountToPay: number;
    networkName?: string;
    cryptoCurrencyCode?: string;
  }) => (
    <div data-testid="onramp-iframe">
      <span data-testid="amount">{usdAmountToPay}</span>
      <span data-testid="network">{networkName}</span>
      <span data-testid="crypto">{cryptoCurrencyCode}</span>
    </div>
  ),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Must import after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { default: OnRamp } = require('../../pages/onramp');

describe('OnRamp page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when query params are missing (empty query)', () => {
    mockUseRouter.mockReturnValue({ query: {} } as ReturnType<
      typeof useRouter
    >);

    const { container } = render(<OnRamp />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when amount is missing', () => {
    mockUseRouter.mockReturnValue({
      query: { networkName: 'ethereum', cryptoCurrencyCode: 'USDC' },
    } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<OnRamp />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when networkName is missing', () => {
    mockUseRouter.mockReturnValue({
      query: { amount: '100', cryptoCurrencyCode: 'USDC' },
    } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<OnRamp />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when cryptoCurrencyCode is missing', () => {
    mockUseRouter.mockReturnValue({
      query: { amount: '100', networkName: 'ethereum' },
    } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<OnRamp />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when amount is 0 (falsy)', () => {
    mockUseRouter.mockReturnValue({
      query: {
        amount: '0',
        networkName: 'ethereum',
        cryptoCurrencyCode: 'USDC',
      },
    } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<OnRamp />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when networkName is an array', () => {
    mockUseRouter.mockReturnValue({
      query: {
        amount: '100',
        networkName: ['ethereum', 'polygon'],
        cryptoCurrencyCode: 'USDC',
      },
    } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<OnRamp />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when cryptoCurrencyCode is an array', () => {
    mockUseRouter.mockReturnValue({
      query: {
        amount: '100',
        networkName: 'ethereum',
        cryptoCurrencyCode: ['USDC', 'ETH'],
      },
    } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<OnRamp />);
    expect(container.innerHTML).toBe('');
  });

  it('renders OnRampIframe with correct props when all params present', () => {
    mockUseRouter.mockReturnValue({
      query: {
        amount: '50.5',
        networkName: 'ethereum',
        cryptoCurrencyCode: 'USDC',
      },
    } as unknown as ReturnType<typeof useRouter>);

    render(<OnRamp />);
    expect(screen.getByTestId('onramp-iframe')).toBeInTheDocument();
    expect(screen.getByTestId('amount')).toHaveTextContent('50.5');
    expect(screen.getByTestId('network')).toHaveTextContent('ethereum');
    expect(screen.getByTestId('crypto')).toHaveTextContent('USDC');
  });

  it('converts amount string to number correctly', () => {
    mockUseRouter.mockReturnValue({
      query: {
        amount: '123.45',
        networkName: 'gnosis',
        cryptoCurrencyCode: 'XDAI',
      },
    } as unknown as ReturnType<typeof useRouter>);

    render(<OnRamp />);
    expect(screen.getByTestId('amount')).toHaveTextContent('123.45');
  });
});
