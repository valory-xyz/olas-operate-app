import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';

import { EvmChainIdMap } from '../../../../constants/chains';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => createElement('img', props),
}));

const mockUsePearlWallet = jest.fn();
const mockAsEvmChainDetails = jest.fn(() => ({ displayName: 'Base' }));
const mockAsMiddlewareChain = jest.fn((chainId?: number) => {
  void chainId;
  return 'base';
});
const mockTokenBalancesToSentence = jest.fn((value?: unknown) => {
  void value;
  return '1 ETH and 2 USDC';
});

jest.mock('../../../../context/PearlWalletProvider', () => ({
  usePearlWallet: () => mockUsePearlWallet(),
}));

jest.mock('../../../../utils', () => ({
  asEvmChainDetails: () => mockAsEvmChainDetails(),
  asMiddlewareChain: (chainId: number) => mockAsMiddlewareChain(chainId),
  tokenBalancesToSentence: (value: unknown) =>
    mockTokenBalancesToSentence(value),
}));

const tokenInputHandlers: Record<string, (value: number | null) => void> = {};

jest.mock('../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'alert' }, message),
  BackButton: ({ onPrev }: { onPrev: () => void }) =>
    createElement('button', { onClick: onPrev }, 'Back'),
  CardFlex: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  cardStyles: {},
  TokenAmountInput: ({
    tokenSymbol,
    value,
    totalAmount,
    onChange,
  }: {
    tokenSymbol: string;
    value: number;
    totalAmount: number;
    onChange: (value: number | null) => void;
  }) => {
    tokenInputHandlers[tokenSymbol] = onChange;
    return createElement(
      'button',
      {
        type: 'button',
        onClick: () => onChange(null),
      },
      `${tokenSymbol}:${value}/${totalAmount}`,
    );
  },
  Tooltip: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  WalletTransferDirection: () =>
    createElement('div', { 'data-testid': 'wallet-direction' }),
}));

jest.mock('antd', () => ({
  Button: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) =>
    createElement('button', { disabled, onClick, type: 'button' }, children),
  Flex: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  Select: ({
    children,
    value,
    onChange,
  }: {
    children: React.ReactNode;
    value: number;
    onChange: (value: number) => void;
  }) =>
    createElement(
      'select',
      {
        'data-testid': 'chain-select',
        value: value ?? '',
        onChange: (event: { target: { value: string } }) =>
          onChange(Number(event.target.value)),
      },
      children,
    ),
  Typography: {
    Title: ({ children }: { children: React.ReactNode }) =>
      createElement('h1', null, children),
    Text: ({ children }: { children: React.ReactNode }) =>
      createElement('span', null, children),
  },
}));

const SelectOption = ({
  value,
}: {
  value: number;
  children: React.ReactNode;
}) => createElement('option', { value }, String(value));

(
  jest.requireMock('antd') as {
    Select: { Option: typeof SelectOption };
  }
).Select.Option = SelectOption;

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  Deposit,
} = require('../../../../components/PearlDeposit/Deposit/Deposit');
/* eslint-enable @typescript-eslint/no-var-requires */

const mockOnBack = jest.fn();
const mockOnContinue = jest.fn();
const mockOnWalletChainChange = jest.fn();
const mockInitializeDepositAmounts = jest.fn();
const mockOnDepositAmountChange = jest.fn();

const setupWalletMock = (
  overrides: Partial<ReturnType<typeof mockUsePearlWallet>> = {},
) => {
  mockUsePearlWallet.mockReturnValue({
    onDepositAmountChange: mockOnDepositAmountChange,
    amountsToDeposit: {
      ETH: { amount: 1 },
      USDC: { amount: 0 },
    },
    availableAssets: [
      { symbol: 'ETH', amount: 5 },
      { symbol: 'USDC', amount: 10 },
    ],
    masterSafeAddress: '0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD',
    walletChainId: EvmChainIdMap.Base,
    initializeDepositAmounts: mockInitializeDepositAmounts,
    defaultRequirementDepositValues: { ETH: { amount: 1 } },
    chains: [{ chainId: EvmChainIdMap.Base, chainName: 'Base' }],
    onWalletChainChange: mockOnWalletChainChange,
    ...overrides,
  });
};

describe('Deposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(tokenInputHandlers).forEach(
      (key) => delete tokenInputHandlers[key],
    );
    setupWalletMock();
  });

  it('initializes deposit amounts on mount', () => {
    render(
      createElement(Deposit, {
        onBack: mockOnBack,
        onContinue: mockOnContinue,
      }),
    );

    expect(mockInitializeDepositAmounts).toHaveBeenCalledTimes(1);
  });

  it('shows the low balance alert for the current chain', () => {
    render(
      createElement(Deposit, {
        onBack: mockOnBack,
        onContinue: mockOnContinue,
      }),
    );

    expect(screen.getByTestId('alert')).toHaveTextContent(
      'Low Pearl Wallet Balance on Base Chain',
    );
    expect(mockTokenBalancesToSentence).toHaveBeenCalledWith({
      ETH: { amount: 1 },
    });
  });

  it('hides the low balance alert when no chain is selected', () => {
    setupWalletMock({
      walletChainId: null,
      defaultRequirementDepositValues: {},
    });

    render(
      createElement(Deposit, {
        onBack: mockOnBack,
        onContinue: mockOnContinue,
      }),
    );

    expect(screen.queryByTestId('alert')).toBeNull();
  });

  it('updates the selected chain without navigation reset', () => {
    render(
      createElement(Deposit, {
        onBack: mockOnBack,
        onContinue: mockOnContinue,
      }),
    );

    fireEvent.change(screen.getByTestId('chain-select'), {
      target: { value: String(EvmChainIdMap.Base) },
    });

    expect(mockOnWalletChainChange).toHaveBeenCalledWith(EvmChainIdMap.Base, {
      canNavigateOnReset: false,
    });
  });

  it('normalizes empty token input values to zero', () => {
    render(
      createElement(Deposit, {
        onBack: mockOnBack,
        onContinue: mockOnContinue,
      }),
    );

    fireEvent.click(screen.getByText('ETH:1/5'));

    expect(mockOnDepositAmountChange).toHaveBeenCalledWith('ETH', {
      amount: 0,
    });
  });

  it('falls back to zero when an asset has no existing deposit amount', () => {
    setupWalletMock({
      amountsToDeposit: {
        ETH: { amount: 1 },
      },
    });

    render(
      createElement(Deposit, {
        onBack: mockOnBack,
        onContinue: mockOnContinue,
      }),
    );

    expect(screen.getByText('USDC:0/10')).toBeInTheDocument();
  });

  it('disables continue when no deposit amount is selected', () => {
    setupWalletMock({
      amountsToDeposit: {
        ETH: { amount: 0 },
        USDC: { amount: 0 },
      },
    });

    render(
      createElement(Deposit, {
        onBack: mockOnBack,
        onContinue: mockOnContinue,
      }),
    );

    expect(screen.getByText('Continue')).toBeDisabled();
  });

  it('disables continue when the Pearl Wallet is not ready', () => {
    setupWalletMock({ masterSafeAddress: null });

    render(
      createElement(Deposit, {
        onBack: mockOnBack,
        onContinue: mockOnContinue,
      }),
    );

    expect(screen.getByText('Continue')).toBeDisabled();
  });

  it('continues when deposit amounts are selected and the wallet exists', () => {
    render(
      createElement(Deposit, {
        onBack: mockOnBack,
        onContinue: mockOnContinue,
      }),
    );

    fireEvent.click(screen.getByText('Continue'));

    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });
});
