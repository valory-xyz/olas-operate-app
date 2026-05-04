/**
 * Tests for OnRampMethodCard — the "Buy Crypto with USD" entry point on the
 * setup funding screen. Asserts: (a) post-OPE-1628 render path (no
 * IS_TRANSAK_UNAVAILABLE wrapper), (b) the inner isFiatAmountTooLow gate is
 * preserved (sub-$5 alert), (c) buy button is disabled while loading or when
 * native-token requirements fail.
 */

import { fireEvent, render, screen } from '@testing-library/react';

import { EvmChainIdMap } from '../../../../../constants/chains';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../../mocks/ethersMulticall').ethersMulticallMock,
);
jest.mock(
  'styled-components',
  () => require('../../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../../constants/providers', () => ({}));
jest.mock('../../../../../config/providers', () => ({}));

const mockGotoSetup = jest.fn();
const mockUpdateNetworkConfig = jest.fn();
const mockUseTotalNativeTokenRequired = jest.fn();
const mockUseTotalFiatFromNativeToken = jest.fn();
const mockUseGetBridgeRequirementsParams = jest.fn();

jest.mock('../../../../../hooks', () => ({
  useSetup: () => ({ goto: mockGotoSetup }),
  useServices: () => ({
    selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Gnosis },
  }),
  useOnRampContext: () => ({ updateNetworkConfig: mockUpdateNetworkConfig }),
  useGetBridgeRequirementsParams: () => mockUseGetBridgeRequirementsParams(),
  useTotalNativeTokenRequired: () => mockUseTotalNativeTokenRequired(),
  useTotalFiatFromNativeToken: () => mockUseTotalFiatFromNativeToken(),
}));

jest.mock('../../../../../components/ui', () => ({
  Alert: ({ message }: { message: string }) => (
    <div data-testid="alert">{message}</div>
  ),
  CardFlex: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-flex">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  TokenRequirements: ({
    fiatAmount,
    isLoading,
    hasError,
  }: {
    fiatAmount: number;
    isLoading: boolean;
    hasError?: boolean;
  }) => (
    <div data-testid="token-requirements">
      {isLoading && <span data-testid="loading">loading</span>}
      {hasError && <span data-testid="error">error</span>}
      <span>{`~$${fiatAmount.toFixed(2)}`}</span>
    </div>
  ),
}));

// Import after mocks
/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  OnRampMethodCard,
} = require('../../../../../components/SetupPage/FundYourAgent/components/OnRampMethodCard');
/* eslint-enable @typescript-eslint/no-var-requires */

const setupMocks = (
  overrides: {
    isLoading?: boolean;
    hasError?: boolean;
    totalNativeToken?: number;
    fiatAmount?: number;
  } = {},
) => {
  mockUseTotalNativeTokenRequired.mockReturnValue({
    isLoading: overrides.isLoading ?? false,
    hasError: overrides.hasError ?? false,
    totalNativeToken: overrides.totalNativeToken ?? 0.005,
  });
  mockUseTotalFiatFromNativeToken.mockReturnValue({
    isLoading: overrides.isLoading ?? false,
    data: { fiatAmount: overrides.fiatAmount ?? 18.17 },
  });
  mockUseGetBridgeRequirementsParams.mockReturnValue(jest.fn());
};

describe('OnRampMethodCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the buy card with TokenRequirements and an enabled Buy Crypto button', () => {
    setupMocks();
    render(<OnRampMethodCard />);

    expect(screen.getByText('Buy')).toBeInTheDocument();
    expect(screen.getByTestId('token-requirements')).toBeInTheDocument();
    expect(screen.getByText('~$18.17')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /Buy Crypto with USD/i });
    expect(button).toBeEnabled();
  });

  it('calls updateNetworkConfig with the resolved chain config on mount', () => {
    setupMocks();
    render(<OnRampMethodCard />);

    expect(mockUpdateNetworkConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        networkId: EvmChainIdMap.Base,
        moonpayCurrencyCode: 'eth_base',
        selectedChainId: EvmChainIdMap.Gnosis,
      }),
    );
  });

  it('routes to SetupOnRamp when the Buy button is clicked', () => {
    setupMocks();
    render(<OnRampMethodCard />);

    fireEvent.click(
      screen.getByRole('button', { name: /Buy Crypto with USD/i }),
    );
    expect(mockGotoSetup).toHaveBeenCalledTimes(1);
  });

  it('shows the sub-$5 alert when fiatAmount falls below MIN_ONRAMP_AMOUNT', () => {
    setupMocks({ fiatAmount: 3 });
    render(<OnRampMethodCard />);

    expect(screen.getByTestId('alert')).toHaveTextContent(
      'The minimum value of crypto to buy with your credit card is $5',
    );
    expect(
      screen.queryByRole('button', { name: /Buy Crypto with USD/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the sub-$5 alert when totalNativeToken is 0', () => {
    setupMocks({ totalNativeToken: 0, fiatAmount: 0 });
    render(<OnRampMethodCard />);

    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });

  it('disables the Buy button while loading', () => {
    setupMocks({ isLoading: true });
    render(<OnRampMethodCard />);

    const button = screen.queryByRole('button', {
      name: /Buy Crypto with USD/i,
    });
    // Loading + fiatAmount=18.17 → not too-low → button rendered + disabled
    expect(button).toBeDisabled();
  });

  it('disables the Buy button when native-token requirements have an error', () => {
    setupMocks({ hasError: true, fiatAmount: 18.17 });
    render(<OnRampMethodCard />);

    const button = screen.getByRole('button', {
      name: /Buy Crypto with USD/i,
    });
    expect(button).toBeDisabled();
  });
});
