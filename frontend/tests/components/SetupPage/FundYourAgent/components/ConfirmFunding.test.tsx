import { fireEvent, render, screen } from '@testing-library/react';

// Import after mocks
import { ConfirmFunding } from '../../../../../components/SetupPage/FundYourAgent/components/ConfirmFunding';
import { PAGES, SETUP_SCREEN } from '../../../../../constants';
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

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <img {...props} alt={props.alt as string} />
  ),
}));

const mockGotoSetup = jest.fn();
const mockGotoPage = jest.fn();
const mockSetIsInitiallyFunded = jest.fn();
const mockUseGetRefillRequirements = jest.fn();

jest.mock('../../../../../hooks', () => ({
  useSetup: () => ({ goto: mockGotoSetup }),
  usePageState: () => ({ goto: mockGotoPage }),
  useServices: () => ({
    selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Gnosis },
  }),
  useIsInitiallyFunded: () => ({
    setIsInitiallyFunded: mockSetIsInitiallyFunded,
  }),
  useGetRefillRequirements: () => mockUseGetRefillRequirements(),
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

describe('ConfirmFunding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetRefillRequirements.mockReturnValue({
      totalTokenRequirements: [
        { symbol: 'OLAS', iconSrc: '/tokens/olas.png', amount: 40 },
        { symbol: 'XDAI', iconSrc: '/tokens/xdai.png', amount: 11.5 },
      ],
      isLoading: false,
    });
  });

  it('renders the title', () => {
    render(<ConfirmFunding />);
    expect(screen.getByText('Confirm Agent Funding')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<ConfirmFunding />);
    expect(
      screen.getByText(/Funds will be transferred from your Pearl wallet/),
    ).toBeInTheDocument();
  });

  it('renders token list with "From Pearl wallet" title', () => {
    render(<ConfirmFunding />);
    expect(screen.getByText('From Pearl wallet')).toBeInTheDocument();
  });

  it('renders token requirements', () => {
    render(<ConfirmFunding />);
    expect(screen.getByText('40 OLAS')).toBeInTheDocument();
    expect(screen.getByText('11.5 XDAI')).toBeInTheDocument();
  });

  it('renders Confirm button', () => {
    render(<ConfirmFunding />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('calls setIsInitiallyFunded and navigates to Main on Confirm click', () => {
    render(<ConfirmFunding />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(mockSetIsInitiallyFunded).toHaveBeenCalledTimes(1);
    expect(mockGotoPage).toHaveBeenCalledWith(PAGES.Main);
  });

  it('navigates back to SelectStaking on back button click', () => {
    render(<ConfirmFunding />);
    fireEvent.click(screen.getByTestId('back-button'));
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.SelectStaking);
  });

  it('disables Confirm button when loading', () => {
    mockUseGetRefillRequirements.mockReturnValue({
      totalTokenRequirements: [],
      isLoading: true,
    });
    render(<ConfirmFunding />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('passes isLoading to RequiredTokenList', () => {
    mockUseGetRefillRequirements.mockReturnValue({
      totalTokenRequirements: [],
      isLoading: true,
    });
    render(<ConfirmFunding />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders the required-token-list component', () => {
    render(<ConfirmFunding />);
    expect(screen.getByTestId('required-token-list')).toBeInTheDocument();
  });
});
