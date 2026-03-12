import { fireEvent, render, screen } from '@testing-library/react';
import { act, createElement } from 'react';

import {
  EvmChainIdMap,
  MiddlewareChainMap,
} from '../../../../constants/chains';
import { MIN_ONRAMP_AMOUNT } from '../../../../constants/onramp';

jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({ providers: [] }));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => createElement('img', props),
}));

const mockUsePearlWallet = jest.fn();
const mockUseFeatureFlag = jest.fn();
const mockUseOnRampContext = jest.fn();
const mockUseGetOnRampRequirementsParams = jest.fn();
const mockUseTotalNativeTokenRequired = jest.fn();
const mockUseTotalFiatFromNativeToken = jest.fn();
const mockAsEvmChainDetails = jest.fn((chain: string) => {
  if (chain === MiddlewareChainMap.GNOSIS) {
    return { displayName: 'Gnosis', name: 'gnosis', symbol: 'XDAI' };
  }

  return { displayName: 'Base', name: 'base', symbol: 'ETH' };
});
const mockAsMiddlewareChain = jest.fn((chainId: number) => {
  if (chainId === EvmChainIdMap.Gnosis) return MiddlewareChainMap.GNOSIS;
  return MiddlewareChainMap.BASE;
});
const mockFormatNumber = jest.fn((value: number, digits?: number) => {
  void digits;
  return value.toFixed(4);
});

jest.mock('../../../../context/PearlWalletProvider', () => ({
  usePearlWallet: () => mockUsePearlWallet(),
}));

jest.mock('../../../../hooks', () => ({
  useFeatureFlag: (...args: unknown[]) => mockUseFeatureFlag(...args),
  useGetOnRampRequirementsParams: (...args: unknown[]) =>
    mockUseGetOnRampRequirementsParams(...args),
  useOnRampContext: () => mockUseOnRampContext(),
  useTotalFiatFromNativeToken: (...args: unknown[]) =>
    mockUseTotalFiatFromNativeToken(...args),
  useTotalNativeTokenRequired: (...args: unknown[]) =>
    mockUseTotalNativeTokenRequired(...args),
}));

jest.mock('../../../../utils', () => ({
  asEvmChainDetails: (chain: string) => mockAsEvmChainDetails(chain),
  asMiddlewareChain: (chainId: number) => mockAsMiddlewareChain(chainId),
  formatNumber: (value: number, digits: number) =>
    mockFormatNumber(value, digits),
  parseEther: (value: number) => `${value}`,
}));

let bridgeCryptoOnProps: Record<string, unknown> | null = null;
let onRampCryptoOnProps: Record<string, unknown> | null = null;
let transferCryptoOnProps: Record<string, unknown> | null = null;

jest.mock(
  '../../../../components/PearlDeposit/SelectPaymentMethod/BridgeCryptoOn',
  () => ({
    BridgeCryptoOn: (props: Record<string, unknown>) => {
      bridgeCryptoOnProps = props;
      return createElement('div', { 'data-testid': 'bridge-crypto-on' });
    },
  }),
);

jest.mock(
  '../../../../components/PearlDeposit/SelectPaymentMethod/OnRampCryptoOn',
  () => ({
    OnRampCryptoOn: (props: Record<string, unknown>) => {
      onRampCryptoOnProps = props;
      return createElement('button', {
        'data-testid': 'onramp-crypto-on',
        onClick: props.onBack as () => void,
      });
    },
  }),
);

jest.mock(
  '../../../../components/PearlDeposit/SelectPaymentMethod/TransferCryptoOn',
  () => ({
    TransferCryptoOn: (props: Record<string, unknown>) => {
      transferCryptoOnProps = props;
      return createElement('div', { 'data-testid': 'transfer-crypto-on' });
    },
  }),
);

jest.mock('../../../../components/PearlWallet', () => ({
  YouPayContainer: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
}));

jest.mock('../../../../components/ui', () => ({
  Alert: ({ message }: { message: string }) =>
    createElement('div', { 'data-testid': 'alert' }, message),
  BackButton: ({ onPrev }: { onPrev: () => void }) =>
    createElement('button', { onClick: onPrev }, 'Back'),
  CardFlex: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    createElement('h2', null, children),
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
  Paragraph: ({ children }: { children: React.ReactNode }) =>
    createElement('p', null, children),
  Skeleton: {
    Input: () => createElement('div', { 'data-testid': 'fiat-loading' }),
  },
  Typography: {
    Paragraph: ({ children }: { children: React.ReactNode }) =>
      createElement('p', null, children),
    Text: ({ children }: { children: React.ReactNode }) =>
      createElement('span', null, children),
    Title: ({ children }: { children: React.ReactNode }) =>
      createElement('h1', null, children),
  },
}));

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  SelectPaymentMethod,
} = require('../../../../components/PearlDeposit/SelectPaymentMethod/SelectPaymentMethod');
/* eslint-enable @typescript-eslint/no-var-requires */

const mockOnBack = jest.fn();
const mockUpdateNetworkConfig = jest.fn();
const mockGetOnRampRequirementsForToken = jest.fn();

const setupMocks = (
  overrides: {
    walletChainId?: number | null;
    bridgeEnabled?: boolean;
    nativeError?: boolean;
    totalNativeToken?: number;
    fiatAmount?: number;
    nativeLoading?: boolean;
    fiatLoading?: boolean;
  } = {},
) => {
  mockUsePearlWallet.mockReturnValue({
    walletChainId:
      overrides.walletChainId === undefined
        ? EvmChainIdMap.Gnosis
        : overrides.walletChainId,
    amountsToDeposit: {
      ETH: { amount: 1 },
      USDC: { amount: 2 },
    },
  });
  mockUseFeatureFlag.mockReturnValue([overrides.bridgeEnabled ?? true]);
  mockUseOnRampContext.mockReturnValue({
    updateNetworkConfig: mockUpdateNetworkConfig,
  });
  mockUseGetOnRampRequirementsParams.mockReturnValue(
    mockGetOnRampRequirementsForToken,
  );
  mockUseTotalNativeTokenRequired.mockReturnValue({
    isLoading: overrides.nativeLoading ?? false,
    hasError: overrides.nativeError ?? false,
    totalNativeToken: overrides.totalNativeToken ?? 1.25,
  });
  mockUseTotalFiatFromNativeToken.mockReturnValue({
    isLoading: overrides.fiatLoading ?? false,
    data: { fiatAmount: overrides.fiatAmount ?? 25.5 },
  });
};

describe('SelectPaymentMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bridgeCryptoOnProps = null;
    onRampCryptoOnProps = null;
    transferCryptoOnProps = null;
    setupMocks();
  });

  it('returns nothing when no wallet chain is selected', () => {
    setupMocks({ walletChainId: null });

    const { container } = render(
      createElement(SelectPaymentMethod, { onBack: mockOnBack }),
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders all payment methods and pre-configures the on-ramp network', () => {
    render(createElement(SelectPaymentMethod, { onBack: mockOnBack }));

    expect(screen.getByText('Buy Crypto with USD')).toBeInTheDocument();
    expect(screen.getByText('Transfer Crypto on Gnosis')).toBeInTheDocument();
    expect(screen.getByText('Bridge Crypto from Ethereum')).toBeInTheDocument();
    expect(mockUpdateNetworkConfig).toHaveBeenCalledWith({
      networkId: EvmChainIdMap.Base,
      networkName: 'base',
      cryptoCurrencyCode: 'ETH',
      selectedChainId: EvmChainIdMap.Gnosis,
    });
  });

  it('hides the bridge option when the feature flag is disabled', () => {
    setupMocks({ bridgeEnabled: false });

    render(createElement(SelectPaymentMethod, { onBack: mockOnBack }));

    expect(screen.queryByText('Bridge Crypto from Ethereum')).toBeNull();
  });

  it('shows the minimum on-ramp value warning when the quote is below the threshold', () => {
    setupMocks({ fiatAmount: MIN_ONRAMP_AMOUNT - 0.01 });

    render(createElement(SelectPaymentMethod, { onBack: mockOnBack }));

    expect(screen.getByTestId('alert')).toHaveTextContent(
      `The minimum value of crypto to buy with your credit card is $${MIN_ONRAMP_AMOUNT}.`,
    );
  });

  it('shows a loading placeholder while the buy quote is loading', () => {
    setupMocks({ nativeLoading: true, fiatLoading: true });

    render(createElement(SelectPaymentMethod, { onBack: mockOnBack }));

    expect(screen.getByTestId('fiat-loading')).toBeInTheDocument();
  });

  it('shows an error state when the on-ramp quote cannot be calculated', () => {
    setupMocks({ nativeError: true });

    render(createElement(SelectPaymentMethod, { onBack: mockOnBack }));

    expect(screen.getByText('Unable to calculate')).toBeInTheDocument();
    expect(screen.getByText('Buy Crypto with USD')).toBeDisabled();
  });

  it('passes a callback to the buy quote hook that returns null for empty amounts', () => {
    setupMocks();
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToDeposit: {
        ETH: { amount: 0 },
      },
    });

    render(createElement(SelectPaymentMethod, { onBack: mockOnBack }));

    const getOnRampParams = mockUseTotalNativeTokenRequired.mock
      .calls[0][2] as (forceUpdate?: boolean) => unknown;

    expect(getOnRampParams()).toBeNull();
  });

  it('passes a callback to the buy quote hook that rejects unsupported tokens', () => {
    setupMocks();
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToDeposit: {
        ETH: { amount: 1 },
      },
    });

    render(createElement(SelectPaymentMethod, { onBack: mockOnBack }));

    const getOnRampParams = mockUseTotalNativeTokenRequired.mock
      .calls[0][2] as (forceUpdate?: boolean) => unknown;

    expect(() => getOnRampParams()).toThrow(
      'Token ETH is not supported on chain 100',
    );
  });

  it('passes native token requests through the buy quote hook using AddressZero', () => {
    setupMocks();
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToDeposit: {
        XDAI: { amount: 1 },
      },
    });
    mockGetOnRampRequirementsForToken.mockImplementation(
      (tokenAddress: string, amount: number) => ({
        tokenAddress,
        amount,
      }),
    );

    render(createElement(SelectPaymentMethod, { onBack: mockOnBack }));

    const getOnRampParams = mockUseTotalNativeTokenRequired.mock
      .calls[0][2] as (forceUpdate?: boolean) => {
      bridge_requests: Array<{ tokenAddress: string; amount: number }>;
    };

    expect(getOnRampParams()).toEqual({
      bridge_requests: [
        {
          tokenAddress: '0x0000000000000000000000000000000000000000',
          amount: 1,
        },
      ],
      force_update: false,
    });
  });

  it('opens the transfer flow with the selected chain name', () => {
    render(createElement(SelectPaymentMethod, { onBack: mockOnBack }));

    fireEvent.click(screen.getByText('Transfer Crypto on Gnosis'));

    expect(screen.getByTestId('transfer-crypto-on')).toBeInTheDocument();
    expect(transferCryptoOnProps).toMatchObject({
      chainName: 'Gnosis',
      onBack: mockOnBack,
    });
  });

  it('opens and closes the bridge flow from the selector screen', () => {
    render(createElement(SelectPaymentMethod, { onBack: mockOnBack }));

    fireEvent.click(screen.getByText('Bridge Crypto from Ethereum'));

    expect(screen.getByTestId('bridge-crypto-on')).toBeInTheDocument();
    expect(bridgeCryptoOnProps).toMatchObject({
      bridgeToChain: MiddlewareChainMap.GNOSIS,
      amountsToDeposit: {
        ETH: { amount: 1 },
        USDC: { amount: 2 },
      },
    });

    act(() => {
      (bridgeCryptoOnProps?.onBack as () => void)();
    });

    expect(screen.getByText('Select Payment Method')).toBeInTheDocument();
  });

  it('opens and closes the on-ramp flow with the mapped on-ramp chain', () => {
    render(createElement(SelectPaymentMethod, { onBack: mockOnBack }));

    fireEvent.click(screen.getByText('Buy Crypto with USD'));

    expect(screen.getByTestId('onramp-crypto-on')).toBeInTheDocument();
    expect(onRampCryptoOnProps).toMatchObject({
      onRampChainId: EvmChainIdMap.Base,
      amountsToDeposit: {
        ETH: { amount: 1 },
        USDC: { amount: 2 },
      },
    });

    fireEvent.click(screen.getByTestId('onramp-crypto-on'));

    expect(screen.getByText('Select Payment Method')).toBeInTheDocument();
  });
});
