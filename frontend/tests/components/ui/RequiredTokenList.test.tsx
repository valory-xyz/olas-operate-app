import { render, screen } from '@testing-library/react';

// Import after mocks
import { RequiredTokenList } from '../../../components/ui/RequiredTokenList';

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

describe('RequiredTokenList', () => {
  const tokenRequirements = [
    { symbol: 'OLAS', iconSrc: '/tokens/olas.png', amount: 40 },
    { symbol: 'XDAI', iconSrc: '/tokens/xdai.png', amount: 11.5 },
  ];

  it('renders all token symbols', () => {
    render(<RequiredTokenList tokenRequirements={tokenRequirements} />);
    expect(screen.getByText(/OLAS/)).toBeInTheDocument();
    expect(screen.getByText(/XDAI/)).toBeInTheDocument();
  });

  it('renders formatted token amounts', () => {
    render(<RequiredTokenList tokenRequirements={tokenRequirements} />);
    expect(screen.getByText('40 OLAS')).toBeInTheDocument();
    expect(screen.getByText('11.5 XDAI')).toBeInTheDocument();
  });

  it('renders token icons', () => {
    render(<RequiredTokenList tokenRequirements={tokenRequirements} />);
    expect(screen.getByAltText('OLAS')).toHaveAttribute(
      'src',
      '/tokens/olas.png',
    );
    expect(screen.getByAltText('XDAI')).toHaveAttribute(
      'src',
      '/tokens/xdai.png',
    );
  });

  it('renders title when provided', () => {
    render(
      <RequiredTokenList
        title="From Pearl wallet"
        tokenRequirements={tokenRequirements}
      />,
    );
    expect(screen.getByText('From Pearl wallet')).toBeInTheDocument();
  });

  it('renders without title', () => {
    render(<RequiredTokenList tokenRequirements={tokenRequirements} />);
    expect(screen.queryByText('From Pearl wallet')).not.toBeInTheDocument();
  });

  it('renders nothing when tokenRequirements is empty', () => {
    const { container } = render(<RequiredTokenList tokenRequirements={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when tokenRequirements is undefined', () => {
    const { container } = render(
      <RequiredTokenList tokenRequirements={undefined as never} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(
      <RequiredTokenList tokenRequirements={[]} isLoading />,
    );
    const skeletons = container.querySelectorAll('.ant-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders title in loading state', () => {
    render(
      <RequiredTokenList
        title="From Pearl wallet"
        tokenRequirements={[]}
        isLoading
      />,
    );
    expect(screen.getByText('From Pearl wallet')).toBeInTheDocument();
  });

  it('renders two skeleton items in loading state', () => {
    const { container } = render(
      <RequiredTokenList tokenRequirements={[]} isLoading />,
    );
    const skeletons = container.querySelectorAll('.ant-skeleton');
    expect(skeletons).toHaveLength(2);
  });

  it('renders single token correctly', () => {
    render(
      <RequiredTokenList
        tokenRequirements={[
          { symbol: 'USDC', iconSrc: '/tokens/usdc.png', amount: 50 },
        ]}
      />,
    );
    expect(screen.getByText('50 USDC')).toBeInTheDocument();
    expect(screen.getByAltText('USDC')).toBeInTheDocument();
  });
});
