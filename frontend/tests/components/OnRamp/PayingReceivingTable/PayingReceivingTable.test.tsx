import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';

import { EvmChainIdMap } from '../../../../constants/chains';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => createElement('img', props),
}));

const mockUseOnRampContext = jest.fn();
const mockUseTotalNativeTokenRequired = jest.fn();
const mockUseTotalFiatFromNativeToken = jest.fn();
const mockAsAllMiddlewareChain = jest.fn((chainId: number) =>
  chainId === EvmChainIdMap.Base ? 'base' : 'gnosis',
);
const mockAsEvmChainDetails = jest.fn((chain: string) => {
  if (chain === 'base') {
    return { name: 'base', displayName: 'Base', symbol: 'ETH' };
  }

  return { name: 'gnosis', displayName: 'Gnosis', symbol: 'XDAI' };
});
const mockFormatAmountNormalized = jest.fn((value: number, digits: number) =>
  value.toFixed(digits),
);

jest.mock('../../../../hooks/useOnRampContext', () => ({
  useOnRampContext: () => mockUseOnRampContext(),
}));

jest.mock('../../../../hooks/useTotalNativeTokenRequired', () => ({
  useTotalNativeTokenRequired: (...args: unknown[]) =>
    mockUseTotalNativeTokenRequired(...args),
}));

jest.mock('../../../../hooks/useTotalFiatFromNativeToken', () => ({
  useTotalFiatFromNativeToken: (...args: unknown[]) =>
    mockUseTotalFiatFromNativeToken(...args),
}));

jest.mock('../../../../utils', () => ({
  formatAmountNormalized: (value: number, digits: number) =>
    mockFormatAmountNormalized(value, digits),
}));

jest.mock('../../../../utils/middlewareHelpers', () => ({
  asAllMiddlewareChain: (chainId: number) => mockAsAllMiddlewareChain(chainId),
  asEvmChainDetails: (chain: string) => mockAsEvmChainDetails(chain),
}));

jest.mock('../../../../components/ui/Table', () => ({
  Table: ({
    columns,
    dataSource,
  }: {
    columns: Array<{ title: React.ReactNode; dataIndex: string }>;
    dataSource: Array<Record<string, React.ReactNode>>;
  }) =>
    createElement(
      'div',
      { 'data-testid': 'table' },
      columns.map((column, index) =>
        createElement('div', { key: `column-${index}` }, column.title),
      ),
      dataSource.map((row, index) =>
        createElement(
          'div',
          { key: `row-${index}` },
          row.paying,
          row.receiving,
        ),
      ),
    ),
}));

jest.mock('antd', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => createElement('button', { onClick, type: 'button' }, children),
  Flex: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  Skeleton: {
    Input: () => createElement('div', { 'data-testid': 'skeleton' }),
  },
  Typography: {
    Text: ({ children }: { children: React.ReactNode }) =>
      createElement('span', null, children),
  },
}));

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  PayingReceivingTable,
} = require('../../../../components/OnRamp/PayingReceivingTable/PayingReceivingTable');
/* eslint-enable @typescript-eslint/no-var-requires */

const mockUpdateUsdAmountToPay = jest.fn();
const mockUpdateNativeAmountWithBuffer = jest.fn();
const mockOnRetry = jest.fn();
const mockGetOnRampRequirementsParams = jest.fn().mockReturnValue(null);

const setupMocks = (
  overrides: {
    selectedChainId?: number | null;
    isOnRampingStepCompleted?: boolean;
    isTransactionSuccessfulButFundsNotReceived?: boolean;
    isBuyCryptoBtnLoading?: boolean;
    nativeLoading?: boolean;
    nativeError?: boolean;
    receivingTokens?: Array<{ symbol: string; amount: number }>;
    fiatLoading?: boolean;
    fiatAmount?: number;
    nativeAmountToDisplay?: number;
  } = {},
) => {
  mockUseOnRampContext.mockReturnValue({
    selectedChainId:
      overrides.selectedChainId === undefined
        ? EvmChainIdMap.Gnosis
        : overrides.selectedChainId,
    isOnRampingStepCompleted: overrides.isOnRampingStepCompleted ?? false,
    isTransactionSuccessfulButFundsNotReceived:
      overrides.isTransactionSuccessfulButFundsNotReceived ?? false,
    isBuyCryptoBtnLoading: overrides.isBuyCryptoBtnLoading ?? false,
    usdAmountToPay: 12.34,
    nativeAmount: 0.45,
    updateUsdAmountToPay: mockUpdateUsdAmountToPay,
    updateNativeAmountWithBuffer: mockUpdateNativeAmountWithBuffer,
  });

  mockUseTotalNativeTokenRequired.mockReturnValue({
    isLoading: overrides.nativeLoading ?? false,
    hasError: overrides.nativeError ?? false,
    totalNativeToken: 0.45,
    receivingTokens: overrides.receivingTokens ?? [
      { symbol: 'USDC', amount: 2 },
    ],
    onRetry: mockOnRetry,
  });

  mockUseTotalFiatFromNativeToken.mockReturnValue({
    isLoading: overrides.fiatLoading ?? false,
    data:
      overrides.fiatAmount === undefined &&
      overrides.nativeAmountToDisplay === undefined
        ? { fiatAmount: 12.34, nativeAmountToDisplay: 0.4567 }
        : {
            fiatAmount: overrides.fiatAmount,
            nativeAmountToDisplay: overrides.nativeAmountToDisplay,
          },
  });
};

describe('PayingReceivingTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('throws when the selected destination chain is missing', () => {
    setupMocks({ selectedChainId: null });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() => {
      render(
        createElement(PayingReceivingTable, {
          onRampChainId: EvmChainIdMap.Base,
          mode: 'deposit',
          getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
        }),
      );
    }).toThrow('Selected chain ID is not set in the on-ramp context');

    consoleErrorSpy.mockRestore();
  });

  it('renders the payment quote and updates the USD amount in context', () => {
    render(
      createElement(PayingReceivingTable, {
        onRampChainId: EvmChainIdMap.Base,
        mode: 'deposit',
        getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
      }),
    );

    expect(screen.getByText('Credit or Debit Card')).toBeInTheDocument();
    expect(screen.getByText('Receiving')).toBeInTheDocument();
    expect(screen.getByText('~$12.34 for')).toBeInTheDocument();
    expect(screen.getByText('0.4567 ETH')).toBeInTheDocument();
    expect(screen.getByText('2 USDC')).toBeInTheDocument();
    expect(mockUpdateUsdAmountToPay).toHaveBeenCalledWith(12.34);
    expect(mockUseTotalFiatFromNativeToken).toHaveBeenCalledWith({
      nativeTokenAmount: 0.45,
      nativeAmount: 0.45,
      selectedChainId: EvmChainIdMap.Gnosis,
      skip: false,
    });
  });

  it('shows a retry state and clears the USD amount when quote calculation fails', () => {
    setupMocks({ nativeError: true });

    render(
      createElement(PayingReceivingTable, {
        onRampChainId: EvmChainIdMap.Base,
        mode: 'deposit',
        getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
      }),
    );

    expect(screen.getByText('Quote request failed')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Try again'));
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
    expect(mockUpdateUsdAmountToPay).toHaveBeenCalledWith(null);
  });

  it('shows loading placeholders while token and fiat quotes are being fetched', () => {
    setupMocks({ nativeLoading: true, fiatLoading: true, receivingTokens: [] });

    render(
      createElement(PayingReceivingTable, {
        onRampChainId: EvmChainIdMap.Base,
        mode: 'deposit',
        getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
      }),
    );

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders n/a when usdAmountToPay is null/falsy', () => {
    mockUseOnRampContext.mockReturnValue({
      selectedChainId: EvmChainIdMap.Gnosis,
      isOnRampingStepCompleted: false,
      isTransactionSuccessfulButFundsNotReceived: false,
      isBuyCryptoBtnLoading: false,
      usdAmountToPay: null,
      nativeAmount: 0.45,
      updateUsdAmountToPay: mockUpdateUsdAmountToPay,
      updateNativeAmountWithBuffer: mockUpdateNativeAmountWithBuffer,
    });

    render(
      createElement(PayingReceivingTable, {
        onRampChainId: EvmChainIdMap.Base,
        mode: 'deposit',
        getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
      }),
    );

    expect(screen.getByText('n/a')).toBeInTheDocument();
  });

  it('displays "0 ETH" when nativeAmountToDisplay is undefined', () => {
    setupMocks({ nativeAmountToDisplay: undefined, fiatAmount: 12.34 });

    render(
      createElement(PayingReceivingTable, {
        onRampChainId: EvmChainIdMap.Base,
        mode: 'deposit',
        getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
      }),
    );

    // onRampChainId=Base -> asAllMiddlewareChain returns 'base' -> asEvmChainDetails returns symbol 'ETH'
    expect(screen.getByText('0 ETH')).toBeInTheDocument();
  });

  it('returns null for receiving tokens with missing icon or symbol', () => {
    setupMocks({
      receivingTokens: [{ symbol: 'UNKNOWN_TOKEN_XYZ', amount: 5 }],
    });

    render(
      createElement(PayingReceivingTable, {
        onRampChainId: EvmChainIdMap.Base,
        mode: 'deposit',
        getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
      }),
    );

    // The unknown token should not render (returns null from ViewReceivingTokens)
    expect(screen.queryByText('5 UNKNOWN_TOKEN_XYZ')).toBeNull();
  });

  it('does not update tokensRequired when isTransactionSuccessfulButFundsNotReceived is true', () => {
    const { rerender } = render(
      createElement(PayingReceivingTable, {
        onRampChainId: EvmChainIdMap.Base,
        mode: 'deposit',
        getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
      }),
    );

    expect(screen.getByText('2 USDC')).toBeInTheDocument();

    // Now change to successful-but-not-received state with different tokens
    setupMocks({
      isTransactionSuccessfulButFundsNotReceived: true,
      receivingTokens: [{ symbol: 'OLAS', amount: 7 }],
    });

    rerender(
      createElement(PayingReceivingTable, {
        onRampChainId: EvmChainIdMap.Base,
        mode: 'deposit',
        getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
      }),
    );

    // Tokens should remain frozen at 2 USDC
    expect(screen.getByText('2 USDC')).toBeInTheDocument();
    expect(screen.queryByText('7 OLAS')).toBeNull();
  });

  it('does not update USD amount when isTransactionSuccessfulButFundsNotReceived is true', () => {
    setupMocks({ isTransactionSuccessfulButFundsNotReceived: true });

    render(
      createElement(PayingReceivingTable, {
        onRampChainId: EvmChainIdMap.Base,
        mode: 'deposit',
        getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
      }),
    );

    // updateUsdAmountToPay should NOT have been called because early return
    expect(mockUpdateUsdAmountToPay).not.toHaveBeenCalled();
  });

  it('does not update USD amount when isBuyCryptoBtnLoading is true', () => {
    setupMocks({ isBuyCryptoBtnLoading: true });

    render(
      createElement(PayingReceivingTable, {
        onRampChainId: EvmChainIdMap.Base,
        mode: 'deposit',
        getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
      }),
    );

    expect(mockUpdateUsdAmountToPay).not.toHaveBeenCalled();
  });

  it('does not update tokensRequired when receivingTokens is undefined', () => {
    mockUseTotalNativeTokenRequired.mockReturnValue({
      isLoading: false,
      hasError: false,
      totalNativeToken: 0.45,
      receivingTokens: undefined,
      onRetry: mockOnRetry,
    });

    render(
      createElement(PayingReceivingTable, {
        onRampChainId: EvmChainIdMap.Base,
        mode: 'deposit',
        getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
      }),
    );

    // When receivingTokens is undefined, setTokensRequired is not called,
    // so no tokens should be displayed in the receiving column
    expect(screen.queryByText('USDC')).toBeNull();
  });

  it('freezes the receiving tokens once the buy step is marked as completed', () => {
    const { rerender } = render(
      createElement(PayingReceivingTable, {
        onRampChainId: EvmChainIdMap.Base,
        mode: 'deposit',
        getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
      }),
    );

    expect(screen.getByText('2 USDC')).toBeInTheDocument();

    setupMocks({
      isOnRampingStepCompleted: true,
      receivingTokens: [{ symbol: 'OLAS', amount: 7 }],
    });

    rerender(
      createElement(PayingReceivingTable, {
        onRampChainId: EvmChainIdMap.Base,
        mode: 'deposit',
        getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
      }),
    );

    expect(screen.getByText('2 USDC')).toBeInTheDocument();
    expect(screen.queryByText('7 OLAS')).toBeNull();
  });
});
