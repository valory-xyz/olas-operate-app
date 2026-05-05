import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { InfoTooltip } from '../../../../components/ui/tooltips/InfoTooltip';
import { COLOR } from '../../../../constants/colors';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Mock antd/es/tooltip to avoid ESM import issues
jest.mock('antd/es/tooltip', () => {
  const Tooltip = ({
    children,
    title,
    placement,
    overlayInnerStyle,
    ...rest
  }: {
    children: React.ReactNode;
    title: React.ReactNode;
    placement?: string;
    overlayInnerStyle?: React.CSSProperties;
    arrow?: boolean;
    [key: string]: unknown;
  }) => (
    <div
      data-testid="tooltip"
      data-placement={placement}
      data-overlay-style={JSON.stringify(overlayInnerStyle)}
      data-arrow={String(rest.arrow)}
    >
      <div data-testid="tooltip-title">{title}</div>
      {children}
    </div>
  );
  return {
    __esModule: true,
    default: Tooltip,
  };
});

jest.mock('react-icons/lu', () => ({
  LuInfo: (props: Record<string, unknown>) => (
    <span
      data-testid="lu-info"
      data-size={props.size}
      data-color={props.color}
      style={props.style as React.CSSProperties}
    >
      info-icon
    </span>
  ),
}));

describe('InfoTooltip', () => {
  it('renders the info icon with default props', () => {
    render(<InfoTooltip>Tooltip content</InfoTooltip>);
    const icon = screen.getByTestId('lu-info');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-size', '16');
    expect(icon).toHaveAttribute('data-color', COLOR.TEXT_NEUTRAL_TERTIARY);
  });

  it('passes children as tooltip title', () => {
    render(<InfoTooltip>My tooltip text</InfoTooltip>);
    expect(screen.getByTestId('tooltip-title')).toHaveTextContent(
      'My tooltip text',
    );
  });

  it('renders with custom iconSize', () => {
    render(<InfoTooltip iconSize={24}>Content</InfoTooltip>);
    const icon = screen.getByTestId('lu-info');
    expect(icon).toHaveAttribute('data-size', '24');
  });

  it('renders with custom iconColor', () => {
    render(<InfoTooltip iconColor={COLOR.BLACK}>Content</InfoTooltip>);
    const icon = screen.getByTestId('lu-info');
    expect(icon).toHaveAttribute('data-color', COLOR.BLACK);
  });

  it('uses topLeft placement by default', () => {
    render(<InfoTooltip>Content</InfoTooltip>);
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toHaveAttribute('data-placement', 'topLeft');
  });

  it('uses custom placement when provided', () => {
    render(<InfoTooltip placement="bottom">Content</InfoTooltip>);
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toHaveAttribute('data-placement', 'bottom');
  });

  it('applies small size width (250px) by default', () => {
    render(<InfoTooltip>Content</InfoTooltip>);
    const tooltip = screen.getByTestId('tooltip');
    const overlayStyle = JSON.parse(
      tooltip.getAttribute('data-overlay-style')!,
    );
    expect(overlayStyle.width).toBe(250);
  });

  it('applies medium size width (360px) when size is medium', () => {
    render(<InfoTooltip size="medium">Content</InfoTooltip>);
    const tooltip = screen.getByTestId('tooltip');
    const overlayStyle = JSON.parse(
      tooltip.getAttribute('data-overlay-style')!,
    );
    expect(overlayStyle.width).toBe(360);
  });

  it('merges overlayInnerStyle with width', () => {
    render(
      <InfoTooltip overlayInnerStyle={{ color: 'red' }}>Content</InfoTooltip>,
    );
    const tooltip = screen.getByTestId('tooltip');
    const overlayStyle = JSON.parse(
      tooltip.getAttribute('data-overlay-style')!,
    );
    expect(overlayStyle.width).toBe(250);
    expect(overlayStyle.color).toBe('red');
  });

  it('disables arrow on the tooltip', () => {
    render(<InfoTooltip>Content</InfoTooltip>);
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toHaveAttribute('data-arrow', 'false');
  });

  it('applies cursor pointer style to the icon', () => {
    render(<InfoTooltip>Content</InfoTooltip>);
    const icon = screen.getByTestId('lu-info');
    expect(icon).toHaveStyle({ cursor: 'pointer' });
  });
});
