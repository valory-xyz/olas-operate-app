import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/router';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../components/OnRampIframe/OnRampIframe', () => ({
  OnRampIframe: ({
    nativeAmount,
    currencyCode,
  }: {
    nativeAmount: string;
    currencyCode: string;
  }) => (
    <div data-testid="onramp-iframe">
      <span data-testid="native-amount">{nativeAmount}</span>
      <span data-testid="currency-code">{currencyCode}</span>
    </div>
  ),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Must import after mocks are set up
/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: OnRamp } = require('../../pages/onramp');
/* eslint-enable @typescript-eslint/no-var-requires */

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

  it('returns null when nativeAmount is missing', () => {
    mockUseRouter.mockReturnValue({
      query: { currencyCode: 'eth_base' },
    } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<OnRamp />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when currencyCode is missing', () => {
    mockUseRouter.mockReturnValue({
      query: { nativeAmount: '0.050000' },
    } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<OnRamp />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when nativeAmount is empty string (falsy)', () => {
    mockUseRouter.mockReturnValue({
      query: { nativeAmount: '', currencyCode: 'eth_base' },
    } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<OnRamp />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when nativeAmount is an array (typeof !== string)', () => {
    mockUseRouter.mockReturnValue({
      query: {
        nativeAmount: ['0.050000', '0.10'],
        currencyCode: 'eth_base',
      },
    } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<OnRamp />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when currencyCode is an array', () => {
    mockUseRouter.mockReturnValue({
      query: {
        nativeAmount: '0.050000',
        currencyCode: ['eth_base', 'pol'],
      },
    } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<OnRamp />);
    expect(container.innerHTML).toBe('');
  });

  it('renders OnRampIframe with both query params (nativeAmount stays string-typed)', () => {
    mockUseRouter.mockReturnValue({
      query: {
        nativeAmount: '0.050000',
        currencyCode: 'eth_base',
      },
    } as unknown as ReturnType<typeof useRouter>);

    render(<OnRamp />);
    expect(screen.getByTestId('onramp-iframe')).toBeInTheDocument();
    expect(screen.getByTestId('native-amount')).toHaveTextContent('0.050000');
    expect(screen.getByTestId('currency-code')).toHaveTextContent('eth_base');
  });

  it('passes the nativeAmount through verbatim (no Number() cast)', () => {
    mockUseRouter.mockReturnValue({
      query: {
        nativeAmount: '12.345678',
        currencyCode: 'pol',
      },
    } as unknown as ReturnType<typeof useRouter>);

    render(<OnRamp />);
    // Ensure precision is preserved exactly as a string — no float rounding.
    expect(screen.getByTestId('native-amount')).toHaveTextContent('12.345678');
    expect(screen.getByTestId('currency-code')).toHaveTextContent('pol');
  });
});
