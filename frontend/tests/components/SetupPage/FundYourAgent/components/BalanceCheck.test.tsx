import { fireEvent, render, screen } from '@testing-library/react';

// Import after mocks
import { BalanceCheck } from '../../../../../components/SetupPage/FundYourAgent/components/BalanceCheck';
import { SETUP_SCREEN } from '../../../../../constants';

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

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <img {...props} alt={props.alt as string} />
  ),
}));

const mockGotoSetup = jest.fn();
jest.mock('../../../../../hooks', () => ({
  useSetup: () => ({ goto: mockGotoSetup }),
}));

const mockUseWalletContribution = jest.fn();
jest.mock('../../../../../hooks/useWalletContribution', () => ({
  useWalletContribution: () => mockUseWalletContribution(),
}));

jest.mock('../../../../../components/ui', () => ({
  BackButton: ({ onPrev }: { onPrev: () => void }) => (
    <button data-testid="back-button" onClick={onPrev}>
      Back
    </button>
  ),
  CardFlex: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-flex">{children}</div>
  ),
  RequiredTokenList: ({
    title,
    tokenRequirements,
    isLoading,
  }: {
    title?: string;
    tokenRequirements: Array<{ symbol: string; amount: number }>;
    isLoading?: boolean;
  }) => (
    <div data-testid="required-token-list">
      {title && <span>{title}</span>}
      {isLoading && <span data-testid="loading">Loading</span>}
      {tokenRequirements?.map((t) => (
        <span key={t.symbol}>
          {t.amount} {t.symbol}
        </span>
      ))}
    </div>
  ),
}));

describe('BalanceCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWalletContribution.mockReturnValue({
      walletContributions: [
        { symbol: 'OLAS', iconSrc: '/tokens/olas.png', amount: 40 },
        { symbol: 'XDAI', iconSrc: '/tokens/xdai.png', amount: 11.5 },
      ],
      isLoading: false,
    });
  });

  it('renders the title', () => {
    render(<BalanceCheck />);
    expect(
      screen.getByText('Using Your Pearl Wallet Balance'),
    ).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<BalanceCheck />);
    expect(
      screen.getByText(/Some of the required funds will be taken/),
    ).toBeInTheDocument();
  });

  it('renders token list with "From Pearl wallet" title', () => {
    render(<BalanceCheck />);
    expect(screen.getByText('From Pearl wallet')).toBeInTheDocument();
  });

  it('renders wallet contribution tokens', () => {
    render(<BalanceCheck />);
    expect(screen.getByText('40 OLAS')).toBeInTheDocument();
    expect(screen.getByText('11.5 XDAI')).toBeInTheDocument();
  });

  it('renders Continue button', () => {
    render(<BalanceCheck />);
    expect(
      screen.getByRole('button', { name: 'Continue' }),
    ).toBeInTheDocument();
  });

  it('navigates to FundYourAgent on Continue click', () => {
    render(<BalanceCheck />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.FundYourAgent);
  });

  it('navigates back to SelectStaking on back button click', () => {
    render(<BalanceCheck />);
    fireEvent.click(screen.getByTestId('back-button'));
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.SelectStaking);
  });

  it('disables Continue button when loading', () => {
    mockUseWalletContribution.mockReturnValue({
      walletContributions: [],
      isLoading: true,
    });
    render(<BalanceCheck />);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('passes isLoading to RequiredTokenList', () => {
    mockUseWalletContribution.mockReturnValue({
      walletContributions: [],
      isLoading: true,
    });
    render(<BalanceCheck />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });
});
