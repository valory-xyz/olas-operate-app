import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { ConfirmTransfer } from '../../../../components/AgentWallet/FundAgent/ConfirmTransfer';
import { MiddlewareChainMap } from '../../../../constants/chains';
import { PAGES } from '../../../../constants/pages';
import {
  useAgentFundingRequests,
  useBalanceAndRefillRequirementsContext,
  useBalanceContext,
  usePageState,
  useService,
  useServices,
} from '../../../../hooks';
import { FundService } from '../../../../service/Fund';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  DEFAULT_SERVICE_CONFIG_ID,
  makeInsufficientGasError,
} from '../../../helpers/factories';

jest.mock('../../../../hooks', () => ({
  useAgentFundingRequests: jest.fn(),
  useBalanceAndRefillRequirementsContext: jest.fn(),
  useBalanceContext: jest.fn(),
  usePageState: jest.fn(),
  useService: jest.fn(),
  useServices: jest.fn(),
}));

jest.mock('../../../../service/Fund', () => ({
  FundService: { fundAgent: jest.fn() },
}));

jest.mock('../../../../context/SupportModalProvider', () => ({
  useSupportModal: () => ({ toggleSupportModal: jest.fn() }),
}));

jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return {
    ...antd,
    Modal: ({
      children,
      open,
    }: {
      children: React.ReactNode;
      open: boolean;
    }) =>
      open ? <div data-testid="transfer-state-modal">{children}</div> : null,
  };
});

jest.mock('../../../../components/ui', () => ({
  InsufficientSignerGasModal: ({
    caseType,
    chain,
    prefillAmountWei,
    onFund,
    onClose,
  }: {
    caseType: string;
    chain: string;
    prefillAmountWei: number | string;
    onFund: () => void;
    onClose: () => void;
  }) => (
    <div data-testid="insufficient-gas-modal">
      <span data-testid="gas-modal-case">{caseType}</span>
      <span data-testid="gas-modal-chain">{chain}</span>
      <span data-testid="gas-modal-amount">{String(prefillAmountWei)}</span>
      <button data-testid="gas-modal-fund" onClick={onFund}>
        Fund
      </button>
      <button data-testid="gas-modal-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

jest.mock('../../../../components/custom-icons', () => ({
  LoadingOutlined: () => <span data-testid="loading-icon" />,
  SuccessOutlined: () => <span data-testid="success-icon" />,
  WarningOutlined: () => <span data-testid="warning-icon" />,
}));

const mockUseServices = useServices as jest.Mock;
const mockUseService = useService as jest.Mock;
const mockUseAgentFundingRequests = useAgentFundingRequests as jest.Mock;
const mockUseBalanceAndRefillRequirementsContext =
  useBalanceAndRefillRequirementsContext as jest.Mock;
const mockUseBalanceContext = useBalanceContext as jest.Mock;
const mockUsePageState = usePageState as jest.Mock;
const mockFundAgent = FundService.fundAgent as jest.Mock;
const mockGoto = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const Wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
};

const setupHappyPath = () => {
  mockUseServices.mockReturnValue({
    selectedService: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
    selectedAgentConfig: {
      middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
      evmHomeChainId: 100,
    },
  });
  mockUseService.mockReturnValue({
    serviceSafes: [{ address: DEFAULT_SAFE_ADDRESS, evmChainId: 100 }],
    serviceEoa: { address: DEFAULT_EOA_ADDRESS },
  });
  mockUseAgentFundingRequests.mockReturnValue({ eoaTokenRequirements: {} });
  mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
    refetch: jest.fn(),
  });
  mockUseBalanceContext.mockReturnValue({ updateBalances: jest.fn() });
  mockUsePageState.mockReturnValue({ goto: mockGoto });
};

const renderComponent = () =>
  render(
    <ConfirmTransfer
      canTransfer
      fundsToTransfer={{ XDAI: { amount: 1 } }}
      onSuccess={jest.fn()}
    />,
    { wrapper: createWrapper() },
  );

const clickConfirm = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Transfer' }));
  });
};

describe('ConfirmTransfer (Case 3 — Fund Agent)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHappyPath();
  });

  it('renders the InsufficientSignerGasModal when fundAgent rejects with INSUFFICIENT_SIGNER_GAS', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFundAgent.mockRejectedValue(makeInsufficientGasError());

    renderComponent();
    await clickConfirm();

    await waitFor(() => {
      expect(screen.getByTestId('insufficient-gas-modal')).toBeInTheDocument();
    });
    expect(screen.getByTestId('gas-modal-case')).toHaveTextContent(
      'fund-agent',
    );
    expect(screen.getByTestId('gas-modal-chain')).toHaveTextContent('gnosis');
    expect(screen.getByTestId('gas-modal-amount')).toHaveTextContent(
      '750000000000000000',
    );
    expect(
      screen.queryByTestId('transfer-state-modal'),
    ).not.toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('falls back to TransferFailed for non-gas errors (regression guard)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFundAgent.mockRejectedValue(new Error('Network timeout'));

    renderComponent();
    await clickConfirm();

    await waitFor(() => {
      expect(screen.getByText('Transfer Failed')).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId('insufficient-gas-modal'),
    ).not.toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('navigates to FundPearlWallet with prefillAmountWei when Fund CTA is clicked', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFundAgent.mockRejectedValue(
      makeInsufficientGasError({ prefill_amount_wei: 2_500_000_000_000_000 }),
    );

    renderComponent();
    await clickConfirm();

    await waitFor(() => {
      expect(screen.getByTestId('insufficient-gas-modal')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('gas-modal-fund'));

    expect(mockGoto).toHaveBeenCalledWith(PAGES.FundPearlWallet, {
      prefillAmountWei: 2_500_000_000_000_000,
    });
    consoleSpy.mockRestore();
  });

  it('closes the gas modal without navigating when dismissed', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFundAgent.mockRejectedValue(makeInsufficientGasError());

    renderComponent();
    await clickConfirm();

    await waitFor(() => {
      expect(screen.getByTestId('insufficient-gas-modal')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('gas-modal-close'));

    expect(
      screen.queryByTestId('insufficient-gas-modal'),
    ).not.toBeInTheDocument();
    expect(mockGoto).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
