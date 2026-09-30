import { act, fireEvent, render, screen } from '@testing-library/react';

import {
  FundingFlow,
  FundingFlowProps,
} from '../../../components/FundingFlow/FundingFlow';
import { FundingRequestService } from '../../../service/FundingRequest';
import { FundingRun } from '../../../types/FundingRun';
import { copyToClipboard } from '../../../utils/copyToClipboard';
import {
  FUNDING_RUN_BASE_USDC,
  FUNDING_RUN_NATIVE,
  makeFundingRun,
} from '../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({ PROVIDERS: {} }));

const mockCreate = jest.fn();
const mockRefreshQuote = jest.fn();
const mockRetry = jest.fn();
const mockToggleSupportModal = jest.fn();
const mockMessageSuccess = jest.fn();
const mockMessageError = jest.fn();

const SOURCES = {
  ethereum: [FUNDING_RUN_NATIVE, '0xA0b86991c6218b36c1d19D4a2e9EB0CE3606EB48'],
  base: [FUNDING_RUN_NATIVE, FUNDING_RUN_BASE_USDC],
  optimism: [FUNDING_RUN_NATIVE, '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'],
  polygon: [FUNDING_RUN_NATIVE, '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'],
  arbitrum_one: [
    FUNDING_RUN_NATIVE,
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  ],
  gnosis: [FUNDING_RUN_NATIVE],
  robinhood: [FUNDING_RUN_NATIVE],
};

type HookState = {
  activeRun: FundingRun | null;
  activeRunError?: boolean;
  createPending?: boolean;
  createError?: boolean;
  sourcesLoading?: boolean;
  sourcesError?: boolean;
};
const mockRefetchActiveRun = jest.fn();
const mockRefetchSources = jest.fn();
const mockCreateReset = jest.fn();
let mockHookState: HookState = { activeRun: null };

jest.mock('../../../hooks/useFundingRun', () => ({
  useFundingRun: () => ({
    activeRun: mockHookState.activeRun,
    isActiveRunFetched: true,
    isActiveRunError: !!mockHookState.activeRunError,
    refetchActiveRun: mockRefetchActiveRun,
    sources:
      mockHookState.sourcesLoading || mockHookState.sourcesError
        ? undefined
        : SOURCES,
    isSourcesLoading: !!mockHookState.sourcesLoading,
    isSourcesError: !!mockHookState.sourcesError,
    refetchSources: mockRefetchSources,
    createMutation: {
      mutate: mockCreate,
      reset: mockCreateReset,
      isPending: !!mockHookState.createPending,
      isError: !!mockHookState.createError,
    },
    refreshQuoteMutation: { mutate: mockRefreshQuote, isPending: false },
    retryMutation: { mutate: mockRetry, isPending: false },
  }),
}));

jest.mock('../../../context/SupportModalProvider', () => ({
  useSupportModal: () => ({ toggleSupportModal: mockToggleSupportModal }),
}));

jest.mock('../../../context/MessageProvider', () => ({
  useMessageApi: () => ({
    success: mockMessageSuccess,
    error: mockMessageError,
  }),
}));

jest.mock('../../../components/ui/AgentSetupCompleteModal', () => ({
  AgentSetupCompleteModal: () => <div>Setup Complete</div>,
}));

jest.mock('../../../service/FundingRequest', () => ({
  FundingRequestService: { submit: jest.fn() },
}));

jest.mock('../../../utils/copyToClipboard', () => ({
  copyToClipboard: jest.fn(),
}));

const mockSubmit = FundingRequestService.submit as jest.Mock;
const mockCopyToClipboard = copyToClipboard as jest.Mock;
const mockOnTransferCompleted = jest.fn();

const ONBOARD_PROPS: FundingFlowProps = {
  mode: 'onboard',
  serviceConfigId: 'sc-1',
  backupOwner: '0x1111111111111111111111111111111111111111',
  destinationChain: 'polygon',
  onBack: jest.fn(),
  onTransferCompleted: mockOnTransferCompleted,
};

const renderFlow = (props: Partial<FundingFlowProps> = {}) =>
  render(
    <FundingFlow {...({ ...ONBOARD_PROPS, ...props } as FundingFlowProps)} />,
  );

const processingRun = (overrides: Partial<FundingRun> = {}) => {
  const base = makeFundingRun();
  return makeFundingRun({
    status: 'PROCESSING',
    steps: base.steps.map((step) => {
      if (step.id === 'receive') {
        return { ...step, status: 'DONE', finished_at: 1790592100 };
      }
      if (step.id === 'bridge') return { ...step, status: 'PROCESSING' };
      return step;
    }),
    ...overrides,
  });
};

beforeEach(() => {
  jest.resetAllMocks();
  mockHookState = { activeRun: null };
});

describe('FundingFlow — selection', () => {
  it('lists the backend source chains, with "Other chain" last', () => {
    renderFlow();

    const labels = screen
      .getAllByRole('button')
      .map((button) => button.textContent?.trim())
      .filter((label) => label && label !== 'Back');
    expect(labels).toEqual([
      'Ethereum',
      'Base',
      'Optimism',
      'Polygon',
      'Arbitrum',
      'Gnosis',
      'Robinhood',
      'Other chain',
    ]);
    expect(screen.queryByText(/Celo|Solana/)).not.toBeInTheDocument();
    expect(
      screen.getByText('Select the preferred chain to send funds from:'),
    ).toBeInTheDocument();
  });

  it('offers only xDAI on Gnosis and only ETH on Robinhood', () => {
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /Gnosis/ }));
    expect(screen.getByRole('button', { name: /XDAI/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /USDC/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    fireEvent.click(screen.getByRole('button', { name: /Robinhood/ }));
    expect(screen.getByRole('button', { name: /ETH/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /USDC/ })).toBeNull();
  });

  it('creates an onboarding run when a token is picked, with no confirm step', () => {
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /Base/ }));
    fireEvent.click(screen.getByRole('button', { name: /USDC/ }));

    expect(mockCreate).toHaveBeenCalledWith(
      {
        mode: 'onboard',
        source: { chain: 'base', token: FUNDING_RUN_BASE_USDC },
        destination: { chain: 'polygon' },
        service_config_id: 'sc-1',
        backup_owner: '0x1111111111111111111111111111111111111111',
      },
      expect.anything(),
    );
    expect(screen.queryByRole('button', { name: /confirm/i })).toBeNull();
  });

  it('sends deposit targets in deposit mode', () => {
    const depositAmounts = { [FUNDING_RUN_NATIVE]: '5000000000000000000' };
    renderFlow({
      mode: 'deposit',
      depositAmounts,
    } as Partial<FundingFlowProps>);
    fireEvent.click(screen.getByRole('button', { name: /Base/ }));
    fireEvent.click(screen.getByRole('button', { name: /USDC/ }));

    expect(mockCreate).toHaveBeenCalledWith(
      {
        mode: 'deposit',
        source: { chain: 'base', token: FUNDING_RUN_BASE_USDC },
        destination: { chain: 'polygon' },
        deposit_amounts: depositAmounts,
      },
      expect.anything(),
    );
  });

  it('shows "Getting a quote" while the run is being created', () => {
    mockHookState = { activeRun: null, createPending: true };
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /Base/ }));
    fireEvent.click(screen.getByRole('button', { name: /USDC/ }));

    expect(screen.getByText('Getting a quote')).toBeInTheDocument();
  });
});

describe('FundingFlow — failures around the run', () => {
  it('shows a failed create as a quote failure, and Retry recreates the same selection', () => {
    const { rerender } = renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /Base/ }));
    fireEvent.click(screen.getByRole('button', { name: /USDC/ }));
    expect(mockCreate).toHaveBeenCalledTimes(1);

    mockHookState = { activeRun: null, createError: true };
    rerender(<FundingFlow {...ONBOARD_PROPS} />);
    expect(screen.getByText("Couldn't get a quote")).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate.mock.calls[1][0]).toEqual(mockCreate.mock.calls[0][0]);
  });

  it('shows why a create failed', () => {
    mockCreate.mockImplementation((_request, options) =>
      options.onError(new Error('Invalid deposit amounts.')),
    );
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /Base/ }));
    fireEvent.click(screen.getByRole('button', { name: /USDC/ }));

    expect(mockMessageError).toHaveBeenCalledWith('Invalid deposit amounts.');
  });

  it('shows the live run found after a failed create instead of the failure', () => {
    const { rerender } = renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /Base/ }));
    fireEvent.click(screen.getByRole('button', { name: /USDC/ }));
    mockHookState = { activeRun: null, createError: true };
    rerender(<FundingFlow {...ONBOARD_PROPS} />);
    expect(screen.getByText("Couldn't get a quote")).toBeInTheDocument();

    // The refetch after the error surfaces the run that blocked the create.
    const live = makeFundingRun({
      id: 'fr-live-after-409',
      source: {
        ...makeFundingRun().source,
        deposit_address: '0x2222222222222222222222222222222222222222',
      },
    });
    mockHookState = { activeRun: live, createError: true };
    rerender(<FundingFlow {...ONBOARD_PROPS} />);

    expect(screen.queryByText("Couldn't get a quote")).toBeNull();
    expect(
      screen.getByText('0x2222222222222222222222222222222222222222'),
    ).toBeInTheDocument();
  });

  it('clears a failed create on Change, so the next selection starts clean', () => {
    const { rerender } = renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /Base/ }));
    fireEvent.click(screen.getByRole('button', { name: /USDC/ }));
    mockHookState = { activeRun: null, createError: true };
    rerender(<FundingFlow {...ONBOARD_PROPS} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Change' })[0]);
    expect(mockCreateReset).toHaveBeenCalledTimes(1);

    mockHookState = { activeRun: null };
    rerender(<FundingFlow {...ONBOARD_PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /Optimism/ }));
    fireEvent.click(screen.getByRole('button', { name: /ETH/ }));

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate.mock.calls[1][0].source.chain).toBe('optimism');
    expect(screen.getByText('Getting a quote')).toBeInTheDocument();
  });

  it('says the status may be stale when a poll fails with a run on screen', () => {
    mockHookState = { activeRun: makeFundingRun(), activeRunError: true };
    renderFlow();

    expect(
      screen.getByText('Connection lost. Showing the last known status.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Waiting for your transfer')).toBeInTheDocument();
  });

  it('tells the user when the retry request itself fails', () => {
    mockRetry.mockImplementation((_id, options) =>
      options.onError(new Error('Funding run failed. Please check the logs.')),
    );
    const run = processingRun();
    mockHookState = {
      activeRun: {
        ...run,
        status: 'FAILED',
        error: { step_id: 'bridge' },
      },
    };
    renderFlow();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockMessageError).toHaveBeenCalledWith(
      'Funding run failed. Please check the logs.',
    );
  });

  it('tells the user when a quote refresh fails', () => {
    mockRefreshQuote.mockImplementation((_id, options) =>
      options.onError(
        new Error('Funding run conflicts with the current run state.'),
      ),
    );
    mockHookState = { activeRun: makeFundingRun({ status: 'QUOTE_FAILED' }) };
    renderFlow();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockMessageError).toHaveBeenCalledWith(
      'Funding run conflicts with the current run state.',
    );
  });

  it('does not offer a new selection when the active run could not be checked', () => {
    mockHookState = { activeRun: null, activeRunError: true };
    renderFlow();

    expect(
      screen.getByText("Couldn't check your funding status."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Select the preferred chain to send funds from:'),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetchActiveRun).toHaveBeenCalled();
  });

  it('treats a cancelled run as no run', () => {
    mockHookState = { activeRun: makeFundingRun({ status: 'CANCELLED' }) };
    renderFlow();

    expect(
      screen.getByText('Select the preferred chain to send funds from:'),
    ).toBeInTheDocument();
  });

  it("offers no Change on another mode's run it cannot recreate", () => {
    mockHookState = { activeRun: makeFundingRun({ mode: 'signer_gas' }) };
    renderFlow();

    expect(screen.getByText('Waiting for your transfer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull();
  });

  it('explains why tokens cannot be picked when there is nothing to deposit', () => {
    renderFlow({
      mode: 'deposit',
      depositAmounts: {},
    } as Partial<FundingFlowProps>);
    fireEvent.click(screen.getByRole('button', { name: /Base/ }));

    expect(
      screen.getByText(
        'There is nothing to deposit. Go back and enter the amounts first.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /USDC/ })).toBeDisabled();
  });

  it('offers no Change on a deposit run when the host has no amounts to resend', () => {
    mockHookState = { activeRun: makeFundingRun({ mode: 'deposit' }) };
    renderFlow({
      mode: 'deposit',
      depositAmounts: {},
    } as Partial<FundingFlowProps>);

    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull();
  });
});

describe('FundingFlow — "To receive"', () => {
  it("shows the run's net delivery", () => {
    mockHookState = { activeRun: makeFundingRun() };
    renderFlow({ fallbackToReceive: [{ symbol: 'OLAS', amount: 999 }] });

    expect(screen.getByText('To receive')).toBeInTheDocument();
    expect(screen.getByText('6.00 POL')).toBeInTheDocument();
    expect(screen.getByText('40.00 OLAS')).toBeInTheDocument();
    expect(screen.getByText('10.00 pUSD')).toBeInTheDocument();
    expect(screen.queryByText('999.00 OLAS')).toBeNull();
  });

  it("shows the entry point's requirement before a run exists, skipping zero amounts", () => {
    renderFlow({
      fallbackToReceive: [
        { symbol: 'POL', amount: 15 },
        { symbol: 'OLAS', amount: 0 },
      ],
    });

    expect(screen.getByText('15.00 POL')).toBeInTheDocument();
    expect(screen.queryByText(/OLAS/)).toBeNull();
  });

  it('marks the amount of a token the app does not know instead of leaving it blank', () => {
    mockHookState = {
      activeRun: makeFundingRun({
        to_receive: [
          {
            token: '0x9999999999999999999999999999999999999999',
            symbol: 'NEW',
            amount: '1000',
          },
        ],
      }),
    };
    renderFlow();

    expect(screen.getByText('Some NEW')).toBeInTheDocument();
  });

  it('renders no summary when nothing is left to receive', () => {
    mockHookState = { activeRun: makeFundingRun({ to_receive: [] }) };
    renderFlow();

    expect(screen.queryByText('To receive')).toBeNull();
  });
});

describe('FundingFlow — quote and deposit address', () => {
  it('renders the quote and the address together, and resumes an existing run on mount', () => {
    mockHookState = { activeRun: makeFundingRun() };
    renderFlow();

    expect(screen.getByText('Waiting for your transfer')).toBeInTheDocument();
    expect(screen.getByText('15.00')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Send funds from your external wallet on Base chain to the wallet address below.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(makeFundingRun().source.deposit_address),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Select the preferred chain to send funds from:'),
    ).toBeNull();
  });

  it('copies the deposit address and confirms it', async () => {
    mockCopyToClipboard.mockResolvedValue(undefined);
    const run = makeFundingRun();
    mockHookState = { activeRun: run };
    renderFlow();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Copy/ }));
    });

    expect(mockCopyToClipboard).toHaveBeenCalledWith(
      run.source.deposit_address,
    );
    expect(mockMessageSuccess).toHaveBeenCalledWith('Address copied!');
  });

  it('says so when the address could not be copied', async () => {
    mockCopyToClipboard.mockRejectedValue(new Error('denied'));
    mockHookState = { activeRun: makeFundingRun() };
    renderFlow();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Copy/ }));
    });

    expect(mockMessageSuccess).not.toHaveBeenCalled();
    expect(mockMessageError).toHaveBeenCalledWith(
      "Couldn't copy the address. Please copy it manually.",
    );
  });

  it('says funds on another chain "might" be lost, never "will"', () => {
    mockHookState = { activeRun: makeFundingRun() };
    const { container } = renderFlow();

    expect(
      screen.getByText('Funds sent on another chain might be lost.'),
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/will be lost/);
  });

  it('shows no address before the first quote lands', () => {
    mockHookState = { activeRun: makeFundingRun({ quote: null }) };
    renderFlow();

    expect(screen.getByText('Getting a quote')).toBeInTheDocument();
    expect(
      screen.queryByText(makeFundingRun().source.deposit_address),
    ).toBeNull();
  });

  it('counts down to the next quote and refreshes on click', () => {
    jest.useFakeTimers();
    try {
      const now = 1_790_592_000;
      jest.setSystemTime(now * 1000);
      mockHookState = {
        activeRun: makeFundingRun({
          quote: { ...makeFundingRun().quote!, next_refresh_at: now + 162 },
        }),
      };
      renderFlow();
      expect(screen.getByText(/Quote update in 2:42/)).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(screen.getByText(/Quote update in 2:40/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Refresh quote/ }));
      expect(mockRefreshQuote).toHaveBeenCalledWith(
        makeFundingRun().id,
        expect.anything(),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows a partial receipt and the reduced outstanding amount', () => {
    mockHookState = {
      activeRun: makeFundingRun({
        quote: {
          ...makeFundingRun().quote!,
          received_amount: '4000000',
          outstanding_amount: '11000000',
        },
      }),
    };
    renderFlow();

    expect(screen.getByText('4.00 USDC received')).toBeInTheDocument();
    expect(screen.getByText('11.00')).toBeInTheDocument();
  });

  it('shows the quote failure with Retry and Contact Support', () => {
    mockHookState = { activeRun: makeFundingRun({ status: 'QUOTE_FAILED' }) };
    renderFlow();

    expect(screen.getByText("Couldn't get a quote")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefreshQuote).toHaveBeenCalledWith(
      makeFundingRun().id,
      expect.anything(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Contact Support' }));
    expect(mockToggleSupportModal).toHaveBeenCalled();
  });

  it('Change on the token recreates the run with the new selection', () => {
    mockHookState = { activeRun: makeFundingRun() };
    renderFlow();

    const [, changeToken] = screen.getAllByRole('button', { name: 'Change' });
    fireEvent.click(changeToken);
    fireEvent.click(screen.getByRole('button', { name: /ETH/ }));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        source: { chain: 'base', token: FUNDING_RUN_NATIVE },
      }),
      expect.anything(),
    );
  });
});

describe('FundingFlow — progress', () => {
  it('hides the Change controls once processing starts', () => {
    mockHookState = { activeRun: processingRun() };
    renderFlow();

    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull();
    expect(screen.getByText('Setting up your agent')).toBeInTheDocument();
    expect(screen.getByText('Moving funds to Polygon')).toBeInTheDocument();
  });

  it('logs finished visible steps newest-first with Details links', () => {
    const run = processingRun();
    mockHookState = {
      activeRun: {
        ...run,
        steps: run.steps.map((step) => {
          if (step.id === 'bridge') {
            return {
              ...step,
              status: 'DONE',
              finished_at: 1790592200,
              explorer_link: 'https://polygonscan.com/tx/0xbridge',
            };
          }
          if (step.id === 'native') return { ...step, status: 'PROCESSING' };
          if (step.id === 'safe') {
            return { ...step, status: 'DONE', finished_at: 1790592999 };
          }
          return step;
        }),
      },
    };
    renderFlow();

    const rows = screen.getAllByText(/^(Received|Moved|Got) /);
    expect(rows.map((row) => row.textContent)).toEqual([
      'Moved 14.80 USDC to Polygon',
      'Received 15.00 USDC',
    ]);
    expect(screen.getByRole('link', { name: /Details/ })).toHaveAttribute(
      'href',
      'https://polygonscan.com/tx/0xbridge',
    );
    expect(screen.getByText('Getting POL for fees')).toBeInTheDocument();
  });

  it('shows "Taking longer than usual..." for a slow step', () => {
    const run = processingRun();
    mockHookState = {
      activeRun: {
        ...run,
        steps: run.steps.map((step) =>
          step.id === 'bridge' ? { ...step, is_slow: true } : step,
        ),
      },
    };
    renderFlow();

    expect(screen.getByText('Taking longer than usual...')).toBeInTheDocument();
  });

  it('words swaps per mode', () => {
    const swapping = (mode: FundingRun['mode']) => {
      const run = processingRun({ mode });
      return {
        ...run,
        steps: run.steps.map((step) => {
          if (step.kind === 'SWAP')
            return { ...step, status: 'PROCESSING' as const };
          if (step.visible) return { ...step, status: 'DONE' as const };
          return step;
        }),
      };
    };

    mockHookState = { activeRun: swapping('onboard') };
    const { unmount } = renderFlow();
    expect(
      screen.getByText('Getting OLAS for activity rewards'),
    ).toBeInTheDocument();
    unmount();

    mockHookState = { activeRun: swapping('deposit') };
    renderFlow({
      mode: 'deposit',
      depositAmounts: {},
    } as Partial<FundingFlowProps>);
    expect(screen.getByText('Getting OLAS')).toBeInTheDocument();
  });

  it('never renders the delegation-clearing step, whatever its status', () => {
    const run = processingRun();
    mockHookState = {
      activeRun: {
        ...run,
        steps: run.steps.map((step) =>
          step.kind === 'CLEAR_DELEGATION'
            ? { ...step, status: 'FAILED', finished_at: 1790599999 }
            : step,
        ),
      },
    };
    renderFlow();

    expect(screen.getByText('Moving funds to Polygon')).toBeInTheDocument();
    expect(screen.queryByText(/Couldn't/)).toBeNull();
  });

  it('names the same failed step in the banner and the row, and retries it', () => {
    const run = processingRun();
    mockHookState = {
      activeRun: {
        ...run,
        status: 'FAILED',
        steps: run.steps.map((step) =>
          step.id === 'bridge'
            ? { ...step, status: 'FAILED', finished_at: 1790592200 }
            : step,
        ),
        error: { step_id: 'bridge' },
      },
    };
    renderFlow();

    expect(screen.getAllByText("Couldn't bridge to Polygon")).toHaveLength(2);
    expect(
      screen.getByText("Don't worry, your funds remain safe."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRetry).toHaveBeenCalledWith(run.id, expect.anything());
  });

  it('shows a generic failure with Retry when no step can be named', () => {
    const run = processingRun();
    mockHookState = {
      activeRun: {
        ...run,
        status: 'FAILED',
        error: null,
      } as unknown as FundingRun,
    };
    renderFlow();

    expect(screen.getAllByText("Couldn't finish the transfer")).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRetry).toHaveBeenCalledWith(run.id, expect.anything());
  });

  it('reports a hidden Safe-step failure on the last visible step', () => {
    const run = processingRun();
    mockHookState = {
      activeRun: {
        ...run,
        status: 'FAILED',
        steps: run.steps.map((step) =>
          step.visible
            ? { ...step, status: 'DONE', finished_at: 1790592200 }
            : step,
        ),
        error: { step_id: 'safe' },
      },
    };
    renderFlow();

    expect(screen.getAllByText("Couldn't get OLAS")).toHaveLength(2);
  });
});

describe('FundingFlow — completion', () => {
  // Every test gets its own run id: acknowledged runs are remembered for the
  // whole module, so a shared id would pass for the wrong reason.
  const completed = (mode: FundingRun['mode'], id: string) =>
    makeFundingRun({
      id,
      mode,
      status: 'COMPLETED',
      steps: makeFundingRun().steps.map((step) => ({
        ...step,
        status: 'DONE' as const,
        finished_at: 1790592300,
      })),
    });

  it('shows the setup-complete modal for an onboarding run, even on first render', () => {
    mockHookState = { activeRun: completed('onboard', 'fr-onboard-first') };
    renderFlow();

    expect(screen.getByText('Your agent is ready!')).toBeInTheDocument();
    expect(screen.getByText('Setup Complete')).toBeInTheDocument();
  });

  it('shows the transfer-completed modal for a deposit run seen live', () => {
    const live = processingRun({ id: 'fr-deposit-seen', mode: 'deposit' });
    mockHookState = { activeRun: live };
    const props = {
      mode: 'deposit',
      depositAmounts: {},
    } as Partial<FundingFlowProps>;
    const { rerender } = renderFlow(props);

    mockHookState = { activeRun: completed('deposit', 'fr-deposit-seen') };
    rerender(
      <FundingFlow {...({ ...ONBOARD_PROPS, ...props } as FundingFlowProps)} />,
    );

    expect(screen.getByText('Transfer is done')).toBeInTheDocument();
    expect(screen.getByText('Transfer Completed!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to Pearl Wallet' }));
    expect(mockOnTransferCompleted).toHaveBeenCalled();
    expect(screen.queryByText('Transfer is done')).toBeNull();
    expect(screen.queryByText('Transfer Completed!')).toBeNull();
  });

  it('shows the transfer-completed modal for a signer-gas run seen live', () => {
    const live = processingRun({ id: 'fr-signer-seen', mode: 'signer_gas' });
    mockHookState = { activeRun: live };
    const props = { mode: 'signer_gas' } as Partial<FundingFlowProps>;
    const { rerender } = renderFlow(props);

    mockHookState = { activeRun: completed('signer_gas', 'fr-signer-seen') };
    rerender(
      <FundingFlow {...({ ...ONBOARD_PROPS, ...props } as FundingFlowProps)} />,
    );

    expect(screen.getByText('Transfer Completed!')).toBeInTheDocument();
  });

  it('does not replay a deposit run that completed before the screen opened', () => {
    mockHookState = { activeRun: completed('deposit', 'fr-deposit-unseen') };
    renderFlow({
      mode: 'deposit',
      depositAmounts: {},
    } as Partial<FundingFlowProps>);

    expect(screen.queryByText('Transfer Completed!')).toBeNull();
    expect(
      screen.getByText('Select the preferred chain to send funds from:'),
    ).toBeInTheDocument();
  });

  it('does not show a completed onboarding run to a deposit host', () => {
    mockHookState = { activeRun: completed('onboard', 'fr-onboard-elsewhere') };
    renderFlow({
      mode: 'deposit',
      depositAmounts: {},
    } as Partial<FundingFlowProps>);

    expect(screen.queryByText('Setup Complete')).toBeNull();
    expect(screen.queryByText('Your agent is ready!')).toBeNull();
    expect(
      screen.getByText('Select the preferred chain to send funds from:'),
    ).toBeInTheDocument();
  });

  it("shows another mode's live run instead of a new selection", () => {
    mockHookState = { activeRun: processingRun({ mode: 'deposit' }) };
    renderFlow();

    expect(screen.getByText('Transferring your funds')).toBeInTheDocument();
    expect(
      screen.queryByText('Select the preferred chain to send funds from:'),
    ).toBeNull();
  });
});

describe('FundingFlow — source chains', () => {
  it('shows a skeleton while the chains load', () => {
    mockHookState = { activeRun: null, sourcesLoading: true };
    const { container } = renderFlow();

    expect(container.querySelector('.ant-skeleton')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Other chain' })).toBeNull();
  });

  it('offers Retry when the chains could not be loaded', () => {
    mockHookState = { activeRun: null, sourcesError: true };
    renderFlow();

    expect(screen.getByText("Couldn't load the chains.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetchSources).toHaveBeenCalled();
  });
});

describe('FundingFlow — Back to Pearl Wallet', () => {
  it('offers the exit only to hosts that pass it', () => {
    const onBackToPearlWallet = jest.fn();
    const { rerender } = renderFlow({ mode: 'signer_gas' });
    expect(
      screen.queryByRole('button', { name: 'Back to Pearl Wallet' }),
    ).toBeNull();

    rerender(
      <FundingFlow
        {...({
          ...ONBOARD_PROPS,
          mode: 'signer_gas',
          onBackToPearlWallet,
        } as FundingFlowProps)}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Back to Pearl Wallet' }),
    );
    expect(onBackToPearlWallet).toHaveBeenCalled();
  });
});

describe('FundingFlow — "Other" requests', () => {
  it('submits only the request fields, acknowledges, and returns to selection', async () => {
    mockSubmit.mockResolvedValue({ success: true });
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /Base/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Other token' }));
    fireEvent.change(screen.getByPlaceholderText('Enter token'), {
      target: { value: ' DAI ' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request Token' }));
    });

    const payload = mockSubmit.mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual([
      'contextChain',
      'kind',
      'requestedName',
      'submissionId',
    ]);
    expect(payload).toMatchObject({
      kind: 'token',
      requestedName: 'DAI',
      contextChain: 'base',
    });
    expect(mockMessageSuccess).toHaveBeenCalledWith('Thank you for your input');
    expect(screen.getByText('Select the token:')).toBeInTheDocument();
  });

  it('keeps the form open and says so when the request fails', async () => {
    mockSubmit.mockResolvedValue({ success: false, error: 'Bad gateway' });
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: 'Other chain' }));
    fireEvent.change(screen.getByPlaceholderText('Enter chain'), {
      target: { value: 'Monad' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request Chain' }));
    });

    expect(mockMessageError).toHaveBeenCalledWith(
      "Couldn't send your request. Please try again.",
    );
    expect(mockMessageSuccess).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Enter chain')).toBeInTheDocument();
  });

  it('sends a chain request without a context chain', async () => {
    mockSubmit.mockResolvedValue({ success: true });
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: 'Other chain' }));
    fireEvent.change(screen.getByPlaceholderText('Enter chain'), {
      target: { value: 'Monad' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request Chain' }));
    });

    expect(mockSubmit.mock.calls[0][0]).toMatchObject({
      kind: 'chain',
      requestedName: 'Monad',
      contextChain: null,
    });
  });
});

describe('FundingFlow — copy guardrails', () => {
  it.each([
    ['awaiting deposit', makeFundingRun()],
    ['processing', processingRun()],
  ])('mentions no gas, paymaster or bundler while %s', (_, run) => {
    mockHookState = { activeRun: run };
    const { container } = renderFlow();

    expect(container.textContent).not.toMatch(/gas|paymaster|bundler/i);
    expect(container.textContent).not.toMatch(/take it into account/);
  });
});
