import { render, screen } from '@testing-library/react';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CardFlex } =
  require('../../../components/ui/CardFlex') as typeof import('../../../components/ui/CardFlex');
/* eslint-enable @typescript-eslint/no-var-requires */

describe('CardFlex', () => {
  it('renders children', () => {
    render(<CardFlex>Card content</CardFlex>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with $gap prop', () => {
    render(<CardFlex $gap={16}>With gap</CardFlex>);
    expect(screen.getByText('With gap')).toBeInTheDocument();
  });

  it('renders without $gap prop', () => {
    render(<CardFlex>No gap</CardFlex>);
    expect(screen.getByText('No gap')).toBeInTheDocument();
  });

  it('renders with $noBodyPadding=true', () => {
    render(<CardFlex $noBodyPadding>No padding</CardFlex>);
    expect(screen.getByText('No padding')).toBeInTheDocument();
  });

  it('renders with $noBodyPadding=false (default)', () => {
    render(<CardFlex $noBodyPadding={false}>Default padding</CardFlex>);
    expect(screen.getByText('Default padding')).toBeInTheDocument();
  });

  it('renders with $noBorder=true', () => {
    render(<CardFlex $noBorder>No border</CardFlex>);
    expect(screen.getByText('No border')).toBeInTheDocument();
  });

  it('renders with $noBorder=false (default)', () => {
    render(<CardFlex $noBorder={false}>With border</CardFlex>);
    expect(screen.getByText('With border')).toBeInTheDocument();
  });

  it('renders with $padding prop', () => {
    render(<CardFlex $padding="10px 20px">Custom padding</CardFlex>);
    expect(screen.getByText('Custom padding')).toBeInTheDocument();
  });

  it('renders with $onboarding=true', () => {
    render(<CardFlex $onboarding>Onboarding</CardFlex>);
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
  });

  it('renders with $onboarding=false', () => {
    render(<CardFlex $onboarding={false}>Not onboarding</CardFlex>);
    expect(screen.getByText('Not onboarding')).toBeInTheDocument();
  });

  it('renders with all props combined', () => {
    render(
      <CardFlex
        $gap={8}
        $noBodyPadding
        $noBorder
        $padding="16px"
        $onboarding
        $newStyles
      >
        All props
      </CardFlex>,
    );
    expect(screen.getByText('All props')).toBeInTheDocument();
  });

  it('renders with $padding when $noBodyPadding is false', () => {
    render(
      <CardFlex $noBodyPadding={false} $padding="24px">
        Padding variant
      </CardFlex>,
    );
    expect(screen.getByText('Padding variant')).toBeInTheDocument();
  });

  it('renders with no optional props at all', () => {
    render(<CardFlex>Minimal</CardFlex>);
    expect(screen.getByText('Minimal')).toBeInTheDocument();
  });
});
