import { render, screen } from '@testing-library/react';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CardSection } =
  require('../../../components/ui/CardSection') as typeof import('../../../components/ui/CardSection');
/* eslint-enable @typescript-eslint/no-var-requires */

describe('CardSection', () => {
  it('renders children', () => {
    render(<CardSection data-testid="section">Content</CardSection>);
    expect(screen.getByTestId('section')).toHaveTextContent('Content');
  });

  it('renders with deprecated bordertop="true"', () => {
    render(
      <CardSection bordertop="true" data-testid="section">
        Top border
      </CardSection>,
    );
    expect(screen.getByTestId('section')).toBeInTheDocument();
  });

  it('renders with deprecated borderbottom="true"', () => {
    render(
      <CardSection borderbottom="true" data-testid="section">
        Bottom border
      </CardSection>,
    );
    expect(screen.getByTestId('section')).toBeInTheDocument();
  });

  it('renders with deprecated bordertop="false"', () => {
    render(
      <CardSection bordertop="false" data-testid="section">
        No top border
      </CardSection>,
    );
    expect(screen.getByTestId('section')).toBeInTheDocument();
  });

  it('renders with $borderTop=true', () => {
    render(
      <CardSection $borderTop data-testid="section">
        Modern top border
      </CardSection>,
    );
    expect(screen.getByTestId('section')).toBeInTheDocument();
  });

  it('renders with $borderBottom=true', () => {
    render(
      <CardSection $borderBottom data-testid="section">
        Modern bottom border
      </CardSection>,
    );
    expect(screen.getByTestId('section')).toBeInTheDocument();
  });

  it('renders with deprecated padding prop', () => {
    render(
      <CardSection padding="16px 24px" data-testid="section">
        Custom padding
      </CardSection>,
    );
    expect(screen.getByTestId('section')).toBeInTheDocument();
  });

  it('renders with $padding prop', () => {
    render(
      <CardSection $padding="8px" data-testid="section">
        New padding
      </CardSection>,
    );
    expect(screen.getByTestId('section')).toBeInTheDocument();
  });

  it('renders with vertical=true', () => {
    render(
      <CardSection vertical data-testid="section">
        Vertical
      </CardSection>,
    );
    expect(screen.getByTestId('section')).toBeInTheDocument();
  });

  it('renders with no optional props (defaults)', () => {
    render(<CardSection data-testid="section">Defaults</CardSection>);
    expect(screen.getByTestId('section')).toBeInTheDocument();
  });

  it('renders with all deprecated and new props combined', () => {
    render(
      <CardSection
        bordertop="true"
        borderbottom="true"
        padding="10px"
        $borderTop
        $borderBottom
        $padding="20px"
        vertical
        data-testid="section"
      >
        All props
      </CardSection>,
    );
    expect(screen.getByTestId('section')).toBeInTheDocument();
  });
});
