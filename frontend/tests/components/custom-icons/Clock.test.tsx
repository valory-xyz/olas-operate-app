import { render } from '@testing-library/react';

import { COLOR } from '../../../constants';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);

// Import after mock
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Clock } =
  require('../../../components/custom-icons/Clock') as typeof import('../../../components/custom-icons/Clock');
/* eslint-enable @typescript-eslint/no-var-requires */

describe('Clock', () => {
  it('renders with danger color', () => {
    const { container } = render(<Clock color="danger" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('color')).toBe(COLOR.ICON_COLOR.DANGER);
  });

  it('renders with warning color', () => {
    const { container } = render(<Clock color="warning" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('color')).toBe(COLOR.ICON_COLOR.WARNING);
  });

  it('renders with default tertiary color when no color prop is provided', () => {
    const { container } = render(<Clock />);
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('color')).toBe(COLOR.TEXT_NEUTRAL_TERTIARY);
  });

  it('renders with default tertiary color when color is undefined', () => {
    const { container } = render(<Clock color={undefined} />);
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('color')).toBe(COLOR.TEXT_NEUTRAL_TERTIARY);
  });

  it('renders TbClock icon with size 18', () => {
    const { container } = render(<Clock color="danger" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('width')).toBe('18');
    expect(svg?.getAttribute('height')).toBe('18');
  });
});
