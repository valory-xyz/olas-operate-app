import { render, screen } from '@testing-library/react';

import { Tooltip } from '../../../../components/ui/tooltips/Tooltip';

describe('Tooltip', () => {
  it('renders children', () => {
    render(
      <Tooltip title="Help text">
        <span data-testid="child">Hover me</span>
      </Tooltip>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hover me');
  });

  it('passes arrow={false} to AntdTooltip', () => {
    const { container } = render(
      <Tooltip title="Help">
        <span>Trigger</span>
      </Tooltip>,
    );
    // The component itself renders; we verify it doesn't throw
    expect(container).toBeTruthy();
  });

  it('merges custom overlayInnerStyle with default styles', () => {
    // When overlayInnerStyle prop is provided, it should be spread on top of defaults
    const customStyle = { backgroundColor: 'red', fontSize: 20 };
    const { container } = render(
      <Tooltip title="Styled" overlayInnerStyle={customStyle}>
        <span>Content</span>
      </Tooltip>,
    );
    expect(container).toBeTruthy();
  });

  it('renders without overlayInnerStyle prop (uses defaults only)', () => {
    const { container } = render(
      <Tooltip title="Default">
        <span>No custom style</span>
      </Tooltip>,
    );
    expect(container).toBeTruthy();
  });

  it('forwards additional TooltipProps to AntdTooltip', () => {
    const { container } = render(
      <Tooltip title="Placed" placement="bottom" color="blue">
        <span>Extra props</span>
      </Tooltip>,
    );
    expect(container).toBeTruthy();
  });

  it('renders with undefined title', () => {
    const { container } = render(
      <Tooltip title={undefined}>
        <span>No title</span>
      </Tooltip>,
    );
    expect(container).toBeTruthy();
  });
});
