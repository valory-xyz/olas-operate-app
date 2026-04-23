import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { EnterWithdrawalAddress } from '../../../../../components/PearlWallet/Withdraw/EnterWithdrawalAddress/EnterWithdrawalAddress';
import { useWithdrawFunds } from '../../../../../components/PearlWallet/Withdraw/EnterWithdrawalAddress/useWithdrawFunds';
import { PAGES } from '../../../../../constants/pages';
import { makeInsufficientGasError } from '../../../../helpers/factories';

jest.mock(
  '../../../../../components/PearlWallet/Withdraw/EnterWithdrawalAddress/useWithdrawFunds',
  () => ({ useWithdrawFunds: jest.fn() }),
);

jest.mock(
  '../../../../../components/PearlWallet/Withdraw/EnterWithdrawalAddress/ChainAndAmountOverview',
  () => ({
    ChainAndAmountOverview: () => <div data-testid="chain-amount-overview" />,
  }),
);

jest.mock(
  '../../../../../components/PearlWallet/Withdraw/EnterWithdrawalAddress/EnterPasswordBeforeWithdrawal',
  () => ({
    EnterPasswordBeforeWithdrawal: ({
      onWithdrawalFunds,
    }: {
      onWithdrawalFunds: () => void;
    }) => (
      <button data-testid="confirm-withdraw" onClick={onWithdrawalFunds}>
        Confirm
      </button>
    ),
  }),
);

const mockGoto = jest.fn();
jest.mock('../../../../../hooks', () => ({
  usePageState: () => ({ goto: mockGoto }),
}));

jest.mock('../../../../../context/MessageProvider', () => ({
  useMessageApi: () => ({ error: jest.fn() }),
}));

jest.mock('../../../../../context/PearlWalletProvider', () => ({
  usePearlWallet: () => ({ onReset: jest.fn() }),
}));

jest.mock('../../../../../context/SupportModalProvider', () => ({
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
    }) => (open ? <div data-testid="password-modal">{children}</div> : null),
  };
});

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('../../../../../components/ui', () => {
  const {
    insufficientGasModalMock,
  } = require('../../../../helpers/insufficientGasModalMock');
  const {
    useInsufficientGasModal,
  } = require('../../../../../components/ui/useInsufficientGasModal');
  return {
    CardFlex: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    cardStyles: {},
    InsufficientSignerGasModal: insufficientGasModalMock,
    useInsufficientGasModal,
  };
});
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('../../../../../components/custom-icons', () => ({
  LoadingOutlined: () => <span data-testid="loading-icon" />,
  SuccessOutlined: () => <span data-testid="success-icon" />,
  WarningOutlined: () => <span data-testid="warning-icon" />,
}));

jest.mock('ethers/lib/utils', () => ({
  ...jest.requireActual('ethers/lib/utils'),
  isAddress: () => true,
}));

const mockUseWithdrawFunds = useWithdrawFunds as jest.Mock;

const openPasswordModal = () => {
  const input = document.querySelector('input') as HTMLInputElement;
  fireEvent.change(input, {
    target: { value: '0x0000000000000000000000000000000000000001' },
  });
  const continueBtn = screen.getByRole('button', { name: 'Continue' });
  fireEvent.click(continueBtn);
};

describe('EnterWithdrawalAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWithdrawFunds.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: false,
      error: null,
      txnHashes: [],
      onAuthorizeWithdrawal: jest.fn(),
    });
  });

  it('renders the InsufficientSignerGasModal on INSUFFICIENT_SIGNER_GAS with caseType="pearl-withdraw"', () => {
    mockUseWithdrawFunds.mockReturnValue({
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: makeInsufficientGasError({ chain: 'optimism' }),
      txnHashes: [],
      onAuthorizeWithdrawal: jest.fn(),
    });

    render(<EnterWithdrawalAddress onBack={jest.fn()} />);
    openPasswordModal();

    expect(screen.getByTestId('insufficient-gas-modal')).toBeInTheDocument();
    expect(screen.getByTestId('gas-modal-case')).toHaveTextContent(
      'pearl-withdraw',
    );
    expect(screen.getByTestId('gas-modal-chain')).toHaveTextContent('optimism');
    expect(screen.queryByTestId('password-modal')).not.toBeInTheDocument();
  });

  it('falls back to the generic WithdrawalFailed for non-gas errors (regression guard)', () => {
    mockUseWithdrawFunds.mockReturnValue({
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: new Error('Bad password'),
      txnHashes: [],
      onAuthorizeWithdrawal: jest.fn(),
    });

    render(<EnterWithdrawalAddress onBack={jest.fn()} />);
    openPasswordModal();

    expect(
      screen.queryByTestId('insufficient-gas-modal'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('password-modal')).toBeInTheDocument();
    expect(screen.getByText('Withdrawal Failed')).toBeInTheDocument();
  });

  it('navigates to FundPearlWallet with prefillAmountWei on CTA click', () => {
    mockUseWithdrawFunds.mockReturnValue({
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: makeInsufficientGasError({
        prefill_amount_wei: 2_500_000_000_000_000,
      }),
      txnHashes: [],
      onAuthorizeWithdrawal: jest.fn(),
    });

    render(<EnterWithdrawalAddress onBack={jest.fn()} />);
    openPasswordModal();
    fireEvent.click(screen.getByTestId('gas-modal-fund'));

    expect(mockGoto).toHaveBeenCalledWith(PAGES.FundPearlWallet, {
      prefillAmountWei: 2_500_000_000_000_000,
    });
  });

  it('closes the gas modal without navigating when dismissed', () => {
    mockUseWithdrawFunds.mockReturnValue({
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: makeInsufficientGasError(),
      txnHashes: [],
      onAuthorizeWithdrawal: jest.fn(),
    });

    render(<EnterWithdrawalAddress onBack={jest.fn()} />);
    openPasswordModal();
    fireEvent.click(screen.getByTestId('gas-modal-close'));

    expect(
      screen.queryByTestId('insufficient-gas-modal'),
    ).not.toBeInTheDocument();
    expect(mockGoto).not.toHaveBeenCalled();
  });
});
