import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { useAgentWallet } from '../../../../components/AgentWallet/AgentWalletProvider';
import { STEPS } from '../../../../components/AgentWallet/types';
import { useWithdrawFunds } from '../../../../components/AgentWallet/Withdraw/useWithdrawFunds';
import { Withdraw } from '../../../../components/AgentWallet/Withdraw/Withdraw';
import { AddressZero } from '../../../../constants';
import { makeInsufficientGasError } from '../../../helpers/factories';

jest.mock(
  '../../../../components/AgentWallet/Withdraw/useWithdrawFunds',
  () => ({ useWithdrawFunds: jest.fn() }),
);
jest.mock('../../../../components/AgentWallet/AgentWalletProvider', () => ({
  useAgentWallet: jest.fn(),
}));
jest.mock(
  '../../../../components/AgentWallet/Withdraw/ChainAndAmountOverview',
  () => ({
    ChainAndAmountOverview: ({ onWithdraw }: { onWithdraw: () => void }) => (
      <button data-testid="withdraw-button" onClick={onWithdraw}>
        Withdraw
      </button>
    ),
  }),
);
jest.mock('../../../../context/SupportModalProvider', () => ({
  useSupportModal: () => ({ toggleSupportModal: jest.fn() }),
}));
/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('../../../../hooks', () => ({
  usePageState: () => ({ goto: jest.fn() }),
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
  const {
    insufficientGasModalMock,
  } = require('../../../helpers/insufficientGasModalMock');
  return {
    cardStyles: {},
    InsufficientSignerGasModal: insufficientGasModalMock,
  };
});
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('../../../../components/custom-icons', () => ({
  LoadingOutlined: () => <span data-testid="loading-icon" />,
  SuccessOutlined: () => <span data-testid="success-icon" />,
  WarningOutlined: () => <span data-testid="warning-icon" />,
}));

const mockUseWithdrawFunds = useWithdrawFunds as jest.Mock;
const mockUseAgentWallet = useAgentWallet as jest.Mock;

describe('Withdraw (AgentWallet)', () => {
  const setFundInitialValues = jest.fn();
  const updateStep = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentWallet.mockReturnValue({
      setFundInitialValues,
      updateStep,
    });
    mockUseWithdrawFunds.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: false,
      error: null,
      onWithdrawFunds: jest.fn(),
    });
  });

  it('renders the InsufficientSignerGasModal when the mutation returns INSUFFICIENT_SIGNER_GAS', () => {
    mockUseWithdrawFunds.mockReturnValue({
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: makeInsufficientGasError(),
      onWithdrawFunds: jest.fn(),
    });

    render(<Withdraw onBack={jest.fn()} />);
    fireEvent.click(screen.getByTestId('withdraw-button'));

    expect(screen.getByTestId('insufficient-gas-modal')).toBeInTheDocument();
    expect(screen.getByTestId('gas-modal-case')).toHaveTextContent(
      'agent-withdraw',
    );
    expect(screen.getByTestId('gas-modal-chain')).toHaveTextContent('gnosis');
    expect(screen.getByTestId('gas-modal-amount')).toHaveTextContent(
      '750000000000000000',
    );
    expect(
      screen.queryByTestId('withdraw-state-modal'),
    ).not.toBeInTheDocument();
  });

  it('falls back to the generic WithdrawalFailed modal for non-gas errors (no regression)', () => {
    mockUseWithdrawFunds.mockReturnValue({
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: new Error('Network timeout'),
      onWithdrawFunds: jest.fn(),
    });

    render(<Withdraw onBack={jest.fn()} />);
    fireEvent.click(screen.getByTestId('withdraw-button'));

    expect(
      screen.queryByTestId('insufficient-gas-modal'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('withdraw-state-modal')).toBeInTheDocument();
    expect(screen.getByText('Withdrawal Failed')).toBeInTheDocument();
  });

  it('prefills fund initial values and steps to FUND_AGENT when Fund Agent CTA is clicked', () => {
    mockUseWithdrawFunds.mockReturnValue({
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: makeInsufficientGasError({
        prefill_amount_wei: '2500000000000000',
      }),
      onWithdrawFunds: jest.fn(),
    });

    render(<Withdraw onBack={jest.fn()} />);
    fireEvent.click(screen.getByTestId('withdraw-button'));
    fireEvent.click(screen.getByTestId('gas-modal-fund'));

    expect(setFundInitialValues).toHaveBeenCalledWith({
      [AddressZero]: '2500000000000000',
    });
    expect(updateStep).toHaveBeenCalledWith(STEPS.FUND_AGENT);
  });

  it('closes the modal without side effects when gas-modal dismiss is clicked', () => {
    mockUseWithdrawFunds.mockReturnValue({
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: makeInsufficientGasError(),
      onWithdrawFunds: jest.fn(),
    });

    render(<Withdraw onBack={jest.fn()} />);
    fireEvent.click(screen.getByTestId('withdraw-button'));
    fireEvent.click(screen.getByTestId('gas-modal-close'));

    expect(
      screen.queryByTestId('insufficient-gas-modal'),
    ).not.toBeInTheDocument();
    expect(setFundInitialValues).not.toHaveBeenCalled();
    expect(updateStep).not.toHaveBeenCalled();
  });

  it('renders the loading state while the mutation is pending', () => {
    mockUseWithdrawFunds.mockReturnValue({
      isLoading: true,
      isError: false,
      isSuccess: false,
      error: null,
      onWithdrawFunds: jest.fn(),
    });

    render(<Withdraw onBack={jest.fn()} />);
    fireEvent.click(screen.getByTestId('withdraw-button'));

    expect(screen.getByText('Withdrawal in Progress')).toBeInTheDocument();
    expect(
      screen.queryByTestId('insufficient-gas-modal'),
    ).not.toBeInTheDocument();
  });
});
