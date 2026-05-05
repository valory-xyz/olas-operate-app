import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { WalletsTooltip } from '../../../../components/ui/tooltips/WalletsTooltip';
import { MiddlewareChainMap } from '../../../../constants/chains';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
} from '../../../helpers/factories';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
jest.mock('../../../../components/ui/AddressLink', () => ({
  AddressLink: ({
    address,
    middlewareChain,
  }: {
    address: string;
    middlewareChain: string;
  }) => (
    <a
      data-testid={`address-link-${address}`}
      data-chain={middlewareChain}
      href="#"
    >
      {address.slice(0, 10)}...
    </a>
  ),
}));

jest.mock('../../../../components/ui/tooltips/InfoTooltip', () => ({
  InfoTooltip: ({
    children,
    ...rest
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="info-tooltip" data-size={rest.size}>
      {children}
    </div>
  ),
}));

describe('WalletsTooltip', () => {
  const defaultProps = {
    eoaAddress: DEFAULT_EOA_ADDRESS,
    safeAddress: DEFAULT_SAFE_ADDRESS,
    middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
  } as const;

  describe('type = "agent"', () => {
    it('renders with Agent title', () => {
      render(<WalletsTooltip type="agent" {...defaultProps} />);
      expect(screen.getByText('Agent Safe Address:')).toBeInTheDocument();
      expect(screen.getByText('Agent Signer Address:')).toBeInTheDocument();
    });

    it('renders agent description', () => {
      render(<WalletsTooltip type="agent" {...defaultProps} />);
      expect(
        screen.getByText(/Shows the spendable balance held by the agent/),
      ).toBeInTheDocument();
    });

    it('renders wallet structure text', () => {
      render(<WalletsTooltip type="agent" {...defaultProps} />);
      expect(
        screen.getByText(/Agent Wallet consists of two parts:/),
      ).toBeInTheDocument();
    });

    it('renders AddressLink for safe address', () => {
      render(<WalletsTooltip type="agent" {...defaultProps} />);
      expect(
        screen.getByTestId(`address-link-${DEFAULT_SAFE_ADDRESS}`),
      ).toBeInTheDocument();
    });

    it('renders AddressLink for eoa address', () => {
      render(<WalletsTooltip type="agent" {...defaultProps} />);
      expect(
        screen.getByTestId(`address-link-${DEFAULT_EOA_ADDRESS}`),
      ).toBeInTheDocument();
    });
  });

  describe('type = "pearl"', () => {
    it('renders with Pearl title', () => {
      render(<WalletsTooltip type="pearl" {...defaultProps} />);
      expect(screen.getByText('Pearl Safe Address:')).toBeInTheDocument();
      expect(screen.getByText('Pearl Signer Address:')).toBeInTheDocument();
    });

    it('renders pearl description', () => {
      render(<WalletsTooltip type="pearl" {...defaultProps} />);
      expect(
        screen.getByText(/Shows your spendable balance on the selected chain/),
      ).toBeInTheDocument();
    });

    it('renders Pearl address labels', () => {
      render(<WalletsTooltip type="pearl" {...defaultProps} />);
      expect(screen.getByText('Pearl Safe Address:')).toBeInTheDocument();
      expect(screen.getByText('Pearl Signer Address:')).toBeInTheDocument();
    });
  });

  describe('missing addresses', () => {
    it('shows "No Agent Safe" when safeAddress is undefined', () => {
      render(
        <WalletsTooltip
          type="agent"
          eoaAddress={DEFAULT_EOA_ADDRESS}
          safeAddress={undefined}
          middlewareHomeChainId={MiddlewareChainMap.GNOSIS}
        />,
      );
      expect(screen.getByText('No Agent Safe')).toBeInTheDocument();
    });

    it('shows "No Agent Signer" when eoaAddress is undefined', () => {
      render(
        <WalletsTooltip
          type="agent"
          eoaAddress={undefined}
          safeAddress={DEFAULT_SAFE_ADDRESS}
          middlewareHomeChainId={MiddlewareChainMap.GNOSIS}
        />,
      );
      expect(screen.getByText('No Agent Signer')).toBeInTheDocument();
    });

    it('shows "No Pearl Safe" when safeAddress is undefined for pearl type', () => {
      render(
        <WalletsTooltip
          type="pearl"
          eoaAddress={DEFAULT_EOA_ADDRESS}
          safeAddress={undefined}
          middlewareHomeChainId={MiddlewareChainMap.GNOSIS}
        />,
      );
      expect(screen.getByText('No Pearl Safe')).toBeInTheDocument();
    });

    it('shows "No Pearl Signer" when eoaAddress is undefined for pearl type', () => {
      render(
        <WalletsTooltip
          type="pearl"
          eoaAddress={undefined}
          safeAddress={DEFAULT_SAFE_ADDRESS}
          middlewareHomeChainId={MiddlewareChainMap.GNOSIS}
        />,
      );
      expect(screen.getByText('No Pearl Signer')).toBeInTheDocument();
    });

    it('shows both "No" messages when both addresses are undefined', () => {
      render(
        <WalletsTooltip
          type="agent"
          eoaAddress={undefined}
          safeAddress={undefined}
          middlewareHomeChainId={MiddlewareChainMap.GNOSIS}
        />,
      );
      expect(screen.getByText('No Agent Safe')).toBeInTheDocument();
      expect(screen.getByText('No Agent Signer')).toBeInTheDocument();
    });
  });
});
