import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { useAgentWallet } from '../../../../components/AgentWallet/AgentWalletProvider';
import { PartialWithdrawScreen } from '../../../../components/AgentWallet/PartialWithdraw/PartialWithdrawScreen';
import { usePartialWithdraw } from '../../../../components/AgentWallet/PartialWithdraw/usePartialWithdraw';
import { useSafeWithdrawableBalance } from '../../../../components/AgentWallet/PartialWithdraw/useSafeWithdrawableBalance';
import { STEPS } from '../../../../components/AgentWallet/types';
import { MiddlewareChainMap } from '../../../../constants/chains';
import { useAvailableAgentAssets, useServices } from '../../../../hooks';
import { makeInsufficientGasError } from '../../../helpers/factories';

jest.mock(
  '../../../../components/AgentWallet/PartialWithdraw/usePartialWithdraw',
  () => ({ usePartialWithdraw: jest.fn() }),
);
jest.mock(
  '../../../../components/AgentWallet/PartialWithdraw/useSafeWithdrawableBalance',
  () => ({ useSafeWithdrawableBalance: jest.fn() }),
);
jest.mock('../../../../components/AgentWallet/AgentWalletProvider', () => ({
  useAgentWallet: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('../../../../hooks', () => ({
  useServices: jest.fn(),
  useAvailableAgentAssets: jest.fn(),
  useInsufficientGasModal: require('../../../../hooks/useInsufficientGasModal')
    .useInsufficientGasModal,
}));
/* eslint-enable @typescript-eslint/no-var-requires */

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
      open ? <div data-testid="withdraw-state-modal">{children}</div> : null,
  };
});

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('../../../../components/ui', () => {
  const ui = jest.requireActual('../../../../components/ui');
  const {
    insufficientGasModalMock,
  } = require('../../../helpers/insufficientGasModalMock');
  return {
    ...ui,
    InsufficientSignerGasModal: insufficientGasModalMock,
  };
});
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('../../../../components/custom-icons', () => ({
  LoadingOutlined: () => <span data-testid="loading-icon" />,
  SuccessOutlined: () => <span data-testid="success-icon" />,
  WarningOutlined: () => <span data-testid="warning-icon" />,
}));

const mockUsePartialWithdraw = usePartialWithdraw as jest.Mock;
const mockUseSafeWithdrawableBalance = useSafeWithdrawableBalance as jest.Mock;
const mockUseAgentWallet = useAgentWallet as jest.Mock;
const mockUseServices = useServices as jest.Mock;
const mockUseAvailableAgentAssets = useAvailableAgentAssets as jest.Mock;

const onPartialWithdraw = jest.fn();
const resetMutation = jest.fn();
const setFundInitialValues = jest.fn();
const updateStep = jest.fn();
const setFundEntrySource = jest.fn();
const onBack = jest.fn();

const gnosisResponse = {
  [MiddlewareChainMap.GNOSIS]: {
    withdrawable_amounts: {
      '0x0000000000000000000000000000000000000000': '40000000000000000000', // 40 XDAI (fully withdrawable — Safe doesn't pay its own gas)
      '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d': '40000000000000000000', // WXDAI
    },
  },
};

// Mirrors useAvailableAgentAssets output: native tokens have `address:
// undefined`, ERC20s (including OLAS) carry their contract address from
// TOKEN_CONFIG. The form's "is native" check is `!asset.address`.
const defaultAvailableAssets = [
  {
    symbol: 'OLAS',
    address: '0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f',
    amount: 0,
  },
  { symbol: 'XDAI', amount: 39.69 }, // native (no address)
  {
    symbol: 'WXDAI',
    address: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
    amount: 40,
  },
];

const setUpHookMocks = (
  overrides: {
    isBalanceLoading?: boolean;
    isBalanceError?: boolean;
    isMutating?: boolean;
    isSuccess?: boolean;
    isError?: boolean;
    error?: unknown;
  } = {},
) => {
  mockUsePartialWithdraw.mockReturnValue({
    isLoading: overrides.isMutating ?? false,
    isError: overrides.isError ?? false,
    isSuccess: overrides.isSuccess ?? false,
    error: overrides.error ?? null,
    onPartialWithdraw,
    resetMutation,
  });

  mockUseSafeWithdrawableBalance.mockReturnValue({
    data: overrides.isBalanceError ? undefined : gnosisResponse,
    isLoading: overrides.isBalanceLoading ?? false,
    isError: overrides.isBalanceError ?? false,
    refetch: jest.fn(),
  });
};

describe('PartialWithdrawScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentWallet.mockReturnValue({
      setFundInitialValues,
      setFundEntrySource,
      updateStep,
    });
    mockUseServices.mockReturnValue({
      selectedAgentConfig: {
        evmHomeChainId: 100,
        middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
      },
    });
    mockUseAvailableAgentAssets.mockReturnValue({
      availableAssets: defaultAvailableAssets,
      isLoading: false,
    });
    setUpHookMocks();
  });

  it('shows a Skeleton while the withdrawable balance is loading', () => {
    setUpHookMocks({ isBalanceLoading: true });
    const { container } = render(<PartialWithdrawScreen onBack={onBack} />);
    // Antd Skeleton renders elements with ant-skeleton class.
    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
  });

  it('renders the error state with Retry + Back when GET fails', () => {
    const refetch = jest.fn();
    mockUseSafeWithdrawableBalance.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    render(<PartialWithdrawScreen onBack={onBack} />);

    expect(
      screen.getByText(/Couldn't load withdrawable balance/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders one row per available asset in useAvailableAgentAssets order', () => {
    render(<PartialWithdrawScreen onBack={onBack} />);

    const tokenLabels = screen.getAllByText(/OLAS|XDAI|WXDAI/);
    // First three matches should be in availableAssets order.
    expect(tokenLabels[0]).toHaveTextContent('OLAS');
    expect(tokenLabels[1]).toHaveTextContent('XDAI');
    expect(tokenLabels[2]).toHaveTextContent('WXDAI');
  });

  it('does not render an info-icon tooltip on any row (backend no longer returns a gas reserve — Safes do not pay their own gas)', () => {
    const { container } = render(<PartialWithdrawScreen onBack={onBack} />);

    // Each TokenAmountInput renders one balance-row container.  Since the
    // gas_reserve field was dropped in olas-operate-middleware#449, the
    // FE no longer renders any conditional info icon — every row should
    // have only the wallet icon (1 svg).
    const balanceRows = container.querySelectorAll('.token-value-and-helper');
    expect(balanceRows.length).toBe(3);
    const iconCounts = Array.from(balanceRows).map(
      (row) => row.querySelectorAll('svg').length,
    );
    expect(iconCounts).toEqual([1, 1, 1]);
  });

  it('disables the Withdraw button when all amounts are zero', () => {
    render(<PartialWithdrawScreen onBack={onBack} />);
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeDisabled();
  });

  it('opens the modal and calls onPartialWithdraw with non-zero amounts only', () => {
    render(<PartialWithdrawScreen onBack={onBack} />);

    // Enter 5 in the second input (XDAI native row — index 1 after OLAS row).
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[1], { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

    expect(onPartialWithdraw).toHaveBeenCalledTimes(1);
    const payload = onPartialWithdraw.mock.calls[0][0];
    const chainKey = MiddlewareChainMap.GNOSIS;
    // Only native (AddressZero) is present — OLAS + WXDAI are zero and omitted.
    expect(Object.keys(payload[chainKey])).toEqual([
      '0x0000000000000000000000000000000000000000',
    ]);
  });

  it('renders WithdrawalFailed when mutation errors and resets on Try Again', () => {
    setUpHookMocks({ isError: true });
    render(<PartialWithdrawScreen onBack={onBack} />);

    // Show the modal first by clicking Withdraw — needs a non-zero amount.
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[1], { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

    expect(screen.getByTestId('withdraw-state-modal')).toBeInTheDocument();
    expect(screen.getByText('Withdrawal Failed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(resetMutation).toHaveBeenCalled();
    expect(onPartialWithdraw).toHaveBeenCalled();
  });

  it('renders InsufficientSignerGasModal when error is INSUFFICIENT_SIGNER_GAS and routes Fund Agent to FUND_AGENT step', () => {
    setUpHookMocks({ isError: true, error: makeInsufficientGasError() });
    render(<PartialWithdrawScreen onBack={onBack} />);

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[1], { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

    expect(screen.getByTestId('insufficient-gas-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('gas-modal-fund'));
    expect(updateStep).toHaveBeenCalledWith(STEPS.FUND_AGENT);
    expect(setFundInitialValues).toHaveBeenCalled();
    expect(setFundEntrySource).toHaveBeenCalledWith('gas-error');
  });

  // Try Again is the user-facing retry on the WithdrawalFailed modal —
  // it must explicitly reset the mutation before re-firing so the modal
  // does not flash the stale "Failed" state during the retry. The
  // closeModal dismiss path (X / outside-click) is handled by useMutation
  // itself — calling mutateAsync transitions the mutation back to
  // 'pending' synchronously, so no stale isError ever renders.
  it('Try Again invokes resetMutation before re-firing the mutation', () => {
    setUpHookMocks({ isError: true });
    render(<PartialWithdrawScreen onBack={onBack} />);

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[1], { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(resetMutation).toHaveBeenCalled();
    expect(onPartialWithdraw).toHaveBeenCalled();
  });

  it('disables Withdraw while a mutation is in flight', () => {
    setUpHookMocks({ isMutating: true });
    render(<PartialWithdrawScreen onBack={onBack} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[1], { target: { value: '5' } });
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeDisabled();
  });

  it('clears entered amounts after a successful withdrawal', () => {
    // Render the form with a non-zero amount staged in the native row,
    // then re-render with isSuccess=true to drive the post-success effect.
    const { rerender } = render(<PartialWithdrawScreen onBack={onBack} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[1], { target: { value: '5' } });
    expect((inputs[1] as HTMLInputElement).value).toBe('5');

    setUpHookMocks({ isSuccess: true });
    rerender(<PartialWithdrawScreen onBack={onBack} />);

    // The native-row input is back to its zero/initial state — without
    // this reset the user would see "Not enough funds" red borders against
    // the freshly-refetched (lower) withdrawable amounts. Antd's controlled
    // NumberInput renders `0` (not "") when the bound state is missing.
    const inputsAfter = screen.getAllByRole('spinbutton');
    expect((inputsAfter[1] as HTMLInputElement).value).toBe('0');
  });
});
