import { render, screen } from '@testing-library/react';

import { AddressLink } from '../../../components/ui/AddressLink';
import {
  EXPLORER_URL_BY_MIDDLEWARE_CHAIN,
  MiddlewareChainMap,
  UNICODE_SYMBOLS,
} from '../../../constants';
import { truncateAddress } from '../../../utils/truncate';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
} from '../../helpers/factories';

describe('AddressLink', () => {
  const defaultProps = {
    address: DEFAULT_EOA_ADDRESS,
    middlewareChain: MiddlewareChainMap.GNOSIS,
  } as const;

  it('renders a link to the block explorer', () => {
    render(<AddressLink {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute(
      'href',
      `${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[MiddlewareChainMap.GNOSIS]}/address/${DEFAULT_EOA_ADDRESS}`,
    );
  });

  it('opens link in a new tab', () => {
    render(<AddressLink {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders truncated address by default', () => {
    const { container } = render(<AddressLink {...defaultProps} />);
    const link = container.querySelector('a')!;
    expect(link.textContent).toContain(truncateAddress(DEFAULT_EOA_ADDRESS));
  });

  it('renders the external link arrow by default', () => {
    const { container } = render(<AddressLink {...defaultProps} />);
    const link = container.querySelector('a')!;
    expect(link.textContent).toContain(UNICODE_SYMBOLS.EXTERNAL_LINK);
  });

  it('hides the link arrow when hideLinkArrow is true', () => {
    const { container } = render(
      <AddressLink {...defaultProps} hideLinkArrow />,
    );
    const link = container.querySelector('a')!;
    expect(link.textContent).not.toContain(UNICODE_SYMBOLS.EXTERNAL_LINK);
  });

  it('renders prefix instead of truncated address when provided', () => {
    render(<AddressLink {...defaultProps} prefix="Custom Label" />);
    expect(screen.getByText(/Custom Label/)).toBeInTheDocument();
    expect(
      screen.queryByText(truncateAddress(DEFAULT_EOA_ADDRESS)),
    ).not.toBeInTheDocument();
  });

  it('returns null when address is empty string', () => {
    const { container } = render(
      <AddressLink
        address={'' as `0x${string}`}
        middlewareChain={MiddlewareChainMap.GNOSIS}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when middlewareChain is empty/falsy', () => {
    const { container } = render(
      <AddressLink
        address={DEFAULT_EOA_ADDRESS}
        middlewareChain={'' as typeof MiddlewareChainMap.GNOSIS}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it.each([
    ['GNOSIS', MiddlewareChainMap.GNOSIS],
    ['BASE', MiddlewareChainMap.BASE],
    ['MODE', MiddlewareChainMap.MODE],
    ['OPTIMISM', MiddlewareChainMap.OPTIMISM],
    ['POLYGON', MiddlewareChainMap.POLYGON],
  ] as const)('renders correct explorer URL for %s chain', (_label, chain) => {
    render(
      <AddressLink address={DEFAULT_SAFE_ADDRESS} middlewareChain={chain} />,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute(
      'href',
      `${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[chain]}/address/${DEFAULT_SAFE_ADDRESS}`,
    );
  });
});
