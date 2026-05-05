import { render } from '@testing-library/react';

import { FireV1 } from '../../../components/custom-icons/FireV1';
import { COLOR } from '../../../constants/colors';

describe('FireV1', () => {
  it('renders an SVG element', () => {
    const { container } = render(<FireV1 />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('uses neutral tertiary fill color when not active', () => {
    const { container } = render(<FireV1 />);
    const paths = container.querySelectorAll('path');
    // All three paths should use the neutral tertiary fill
    expect(paths[0]).toHaveAttribute('fill', COLOR.TEXT_NEUTRAL_TERTIARY);
    // Second path: subColor is undefined, so fallback to fillColor
    expect(paths[1]).toHaveAttribute('fill', COLOR.TEXT_NEUTRAL_TERTIARY);
    expect(paths[2]).toHaveAttribute('fill', COLOR.TEXT_NEUTRAL_TERTIARY);
  });

  it('uses neutral tertiary fill color when isActive is false', () => {
    const { container } = render(<FireV1 isActive={false} />);
    const paths = container.querySelectorAll('path');
    expect(paths[0]).toHaveAttribute('fill', COLOR.TEXT_NEUTRAL_TERTIARY);
    expect(paths[1]).toHaveAttribute('fill', COLOR.TEXT_NEUTRAL_TERTIARY);
    expect(paths[2]).toHaveAttribute('fill', COLOR.TEXT_NEUTRAL_TERTIARY);
  });

  it('uses orange fill and yellow sub-color when isActive is true', () => {
    const { container } = render(<FireV1 isActive />);
    const paths = container.querySelectorAll('path');
    // First and third paths use fillColor (orange)
    expect(paths[0]).toHaveAttribute('fill', COLOR.ICON_COLOR.ORANGE);
    // Second path uses subColor (yellow)
    expect(paths[1]).toHaveAttribute('fill', COLOR.ICON_COLOR.YELLOW);
    // Third path uses fillColor (orange)
    expect(paths[2]).toHaveAttribute('fill', COLOR.ICON_COLOR.ORANGE);
  });
});
