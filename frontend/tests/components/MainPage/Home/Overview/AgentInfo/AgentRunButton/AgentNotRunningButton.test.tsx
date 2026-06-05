import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { STEPS } from '../../../../../../../components/AgentWallet/types';
import { AgentNotRunningButton } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentRunButton/AgentNotRunningButton';
import { AddressZero } from '../../../../../../../constants/address';
import { PAGES } from '../../../../../../../constants/pages';
import { usePageState, useServiceDeployment } from '../../../../../../../hooks';
import { makeInsufficientGasError } from '../../../../../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('../../../../../../../hooks', () => ({
  useInsufficientGasModal:
    require('../../../../../../../hooks/useInsufficientGasModal')
      .useInsufficientGasModal,
  usePageState: jest.fn(),
  useServiceDeployment: jest.fn(),
}));

jest.mock('../../../../../../../components/ui', () => {
  const {
    insufficientGasModalMock,
  } = require('../../../../../../helpers/insufficientGasModalMock');
  return { InsufficientSignerGasModal: insufficientGasModalMock };
});
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock(
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentRunButton/AgentBusyButton',
  () => ({
    AgentBusyButton: ({ text }: { text: string }) => (
      <div data-testid="agent-busy-button">{text}</div>
    ),
  }),
);

const mockUseServiceDeployment = useServiceDeployment as jest.Mock;
const mockUsePageState = usePageState as jest.Mock;
const mockGoto = jest.fn();

const renderWith = (
  serviceDeployment: Partial<ReturnType<typeof useServiceDeployment>>,
) => {
  mockUseServiceDeployment.mockReturnValue({
    isLoading: false,
    isDeployable: true,
    handleStart: jest.fn(),
    isStartError: false,
    startError: null,
    resetStart: jest.fn(),
    ...serviceDeployment,
  } as unknown as ReturnType<typeof useServiceDeployment>);
  mockUsePageState.mockReturnValue({
    goto: mockGoto,
  } as unknown as ReturnType<typeof usePageState>);
  return render(<AgentNotRunningButton />);
};

describe('AgentNotRunningButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the busy button while loading', () => {
    renderWith({ isLoading: true });
    expect(screen.getByTestId('agent-busy-button')).toBeInTheDocument();
  });

  it('renders the start button when deployable', () => {
    renderWith({ isDeployable: true });
    expect(
      screen.getByRole('button', { name: 'Start agent' }),
    ).toBeInTheDocument();
  });

  it('shows the InsufficientSignerGasModal when start fails with INSUFFICIENT_SIGNER_GAS', () => {
    renderWith({
      isStartError: true,
      startError: makeInsufficientGasError(),
    });
    expect(screen.getByTestId('insufficient-gas-modal')).toBeInTheDocument();
    expect(screen.getByTestId('gas-modal-case')).toHaveTextContent(
      'start-service',
    );
    expect(screen.getByTestId('gas-modal-chain')).toHaveTextContent('gnosis');
    expect(screen.getByTestId('gas-modal-amount')).toHaveTextContent(
      '750000000000000000',
    );
  });

  it('does not render the modal for non-gas start errors', () => {
    renderWith({
      isStartError: true,
      startError: new Error('Network timeout'),
    });
    expect(
      screen.queryByTestId('insufficient-gas-modal'),
    ).not.toBeInTheDocument();
  });

  it('navigates to AgentWallet with FUND_AGENT + gas-error fund source when Fund CTA clicked', () => {
    renderWith({
      isStartError: true,
      startError: makeInsufficientGasError({
        prefill_amount_wei: '2500000000000000',
      }),
    });
    fireEvent.click(screen.getByTestId('gas-modal-fund'));
    expect(mockGoto).toHaveBeenCalledWith(PAGES.AgentWallet, {
      initialStep: STEPS.FUND_AGENT,
      initialFundValues: { [AddressZero]: '2500000000000000' },
      initialFundEntrySource: 'gas-error',
    });
  });

  it('resets mutation state on dismiss', () => {
    const resetStart = jest.fn();
    renderWith({
      isStartError: true,
      startError: makeInsufficientGasError(),
      resetStart,
    });
    fireEvent.click(screen.getByTestId('gas-modal-close'));
    expect(resetStart).toHaveBeenCalled();
  });

  it('invokes handleStart when the Start button is clicked', async () => {
    const handleStart = jest.fn().mockResolvedValue(undefined);
    renderWith({ handleStart });
    fireEvent.click(screen.getByRole('button', { name: 'Start agent' }));
    await waitFor(() => expect(handleStart).toHaveBeenCalled());
  });

  it('swallows handleStart rejections (the error is surfaced via startError)', async () => {
    const handleStart = jest.fn().mockRejectedValue(new Error('boom'));
    renderWith({ handleStart });
    fireEvent.click(screen.getByRole('button', { name: 'Start agent' }));
    await waitFor(() => expect(handleStart).toHaveBeenCalled());
    // No unhandled rejection → if it threw, this test would fail with an
    // unhandled-promise jest error.
  });

  // Full state-transition sweep — guards against the dismiss→retry bug class
  // where stale error state re-renders the wrong modal on the second attempt.
  it('full sequence: trigger → gas error → dismiss → retry runs handleStart again with state reset', async () => {
    const handleStart = jest.fn().mockResolvedValue(undefined);
    const resetStart = jest.fn();
    const { rerender } = renderWith({
      handleStart,
      isStartError: true,
      startError: makeInsufficientGasError(),
      resetStart,
    });

    // 1. Modal visible on the error frame
    expect(screen.getByTestId('insufficient-gas-modal')).toBeInTheDocument();

    // 2. Dismiss → resetStart fires
    fireEvent.click(screen.getByTestId('gas-modal-close'));
    expect(resetStart).toHaveBeenCalled();

    // 3. Simulate the parent updating state (resetStart cleared startError)
    mockUseServiceDeployment.mockReturnValue({
      isLoading: false,
      isDeployable: true,
      handleStart,
      isStartError: false,
      startError: null,
      resetStart,
    } as unknown as ReturnType<typeof useServiceDeployment>);
    rerender(<AgentNotRunningButton />);

    // 4. Modal no longer rendered; Start button re-clickable
    expect(
      screen.queryByTestId('insufficient-gas-modal'),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start agent' }));
    await waitFor(() => expect(handleStart).toHaveBeenCalledTimes(1));
  });
});
