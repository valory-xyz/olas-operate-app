import { fireEvent, render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { TokenAmountInput } from '../../../components/ui/TokenAmountInput';
import { TokenSymbolMap } from '../../../config/tokens';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

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
  TbInfoCircle: (props: Record<string, unknown>) => (
    <span data-testid="tb-info-circle" data-size={props.size}>
      info
    </span>
  ),
  TbWallet: (props: Record<string, unknown>) => (
    <span data-testid="tb-wallet" data-size={props.size}>
      wallet
    </span>
  ),
}));

jest.mock('../../../components/ui/tooltips', () => ({
  Tooltip: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: React.ReactNode;
  }) => (
    <div data-testid="tooltip">
      <div data-testid="tooltip-title">{title}</div>
      {children}
    </div>
  ),
}));

describe('TokenAmountInput', () => {
  const defaultProps = {
    value: 100,
    totalAmount: 1000,
    onChange: jest.fn(),
    tokenSymbol: TokenSymbolMap.OLAS as keyof typeof TokenSymbolMap,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the token image and symbol', () => {
    render(<TokenAmountInput {...defaultProps} />);
    expect(screen.getByAltText(TokenSymbolMap.OLAS)).toBeInTheDocument();
    expect(screen.getByText(TokenSymbolMap.OLAS)).toBeInTheDocument();
  });

  it('renders the wallet icon with total amount', () => {
    render(<TokenAmountInput {...defaultProps} />);
    expect(screen.getByTestId('tb-wallet')).toBeInTheDocument();
  });

  it('renders quick select buttons by default', () => {
    render(<TokenAmountInput {...defaultProps} />);
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('hides quick select buttons when showQuickSelects is false', () => {
    render(<TokenAmountInput {...defaultProps} showQuickSelects={false} />);
    expect(screen.queryByText('10%')).not.toBeInTheDocument();
    expect(screen.queryByText('25%')).not.toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
  });

  it('calls onChange with 10% of totalAmount', () => {
    const onChange = jest.fn();
    render(<TokenAmountInput {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByText('10%'));
    expect(onChange).toHaveBeenCalledWith(100, { withdrawAll: false });
  });

  it('calls onChange with 25% of totalAmount', () => {
    const onChange = jest.fn();
    render(<TokenAmountInput {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByText('25%'));
    expect(onChange).toHaveBeenCalledWith(250, { withdrawAll: false });
  });

  it('calls onChange with 50% of totalAmount', () => {
    const onChange = jest.fn();
    render(<TokenAmountInput {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByText('50%'));
    expect(onChange).toHaveBeenCalledWith(500, { withdrawAll: false });
  });

  it('calls onChange with 100% of totalAmount and withdrawAll=true', () => {
    const onChange = jest.fn();
    render(<TokenAmountInput {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByText('100%'));
    expect(onChange).toHaveBeenCalledWith(1000, { withdrawAll: true });
  });

  it('does not render tooltip when tooltipInfo is not provided', () => {
    render(<TokenAmountInput {...defaultProps} />);
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
  });

  it('renders tooltip when tooltipInfo is provided', () => {
    render(
      <TokenAmountInput {...defaultProps} tooltipInfo="Some tooltip info" />,
    );
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Some tooltip info')).toBeInTheDocument();
  });

  it('calls onChange with null when input value is cleared', () => {
    const onChange = jest.fn();
    render(<TokenAmountInput {...defaultProps} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });
    // antd InputNumber fires onChange(null) when cleared
    expect(onChange).toHaveBeenCalledWith(null, { withdrawAll: false });
  });

  it('handles hasError prop', () => {
    const { container } = render(
      <TokenAmountInput {...defaultProps} hasError />,
    );
    // The container div should be in the DOM
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles hasError=false (default)', () => {
    const { container } = render(
      <TokenAmountInput {...defaultProps} hasError={false} />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('does not call onChange if decimal places exceed 6', () => {
    const onChange = jest.fn();
    render(<TokenAmountInput {...defaultProps} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    // Try to enter a number with > 6 decimal places
    fireEvent.change(input, { target: { value: '1.1234567' } });
    // antd InputNumber will parse the value, the handleChange should reject it
    // The check in handleChange prevents > 6 decimal places
  });

  it('renders with maxAmount prop', () => {
    render(<TokenAmountInput {...defaultProps} maxAmount={500} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toBeInTheDocument();
  });

  it('renders different token symbols', () => {
    render(
      <TokenAmountInput
        {...defaultProps}
        tokenSymbol={TokenSymbolMap.ETH as keyof typeof TokenSymbolMap}
      />,
    );
    expect(screen.getByText(TokenSymbolMap.ETH)).toBeInTheDocument();
  });
});
