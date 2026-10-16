import { fireEvent, render, screen } from '@testing-library/react';
import { act, createElement } from 'react';

import {
  EvmChainIdMap,
  MiddlewareChainMap,
} from '../../../../constants/chains';

jest.mock('../../../../constants/providers', () => ({ PROVIDERS: {} }));
jest.mock('../../../../config/providers', () => ({ providers: [] }));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => createElement('img', props),
}));

const mockUsePearlWallet = jest.fn();
const mockUseFeatureFlag = jest.fn();
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
}));

jest.mock('../../../../utils', () => ({
  asEvmChainDetails: (chain: string) => mockAsEvmChainDetails(chain),
  asMiddlewareChain: (chainId: number) => mockAsMiddlewareChain(chainId),
  formatNumber: (value: number, digits: number) =>
    mockFormatNumber(value, digits),
  parseEther: (value: number) => `${value}`,
}));

let bridgeCryptoOnProps: Record<string, unknown> | null = null;
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
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => createElement('button', { onClick, type: 'button' }, children),
  Flex: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  Paragraph: ({ children }: { children: React.ReactNode }) =>
    createElement('p', null, children),
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

const setupMocks = (
  overrides: {
    walletChainId?: number | null;
    bridgeEnabled?: boolean;
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
};

describe('SelectPaymentMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bridgeCryptoOnProps = null;
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

  it('renders the transfer and bridge payment methods', () => {
    render(createElement(SelectPaymentMethod, { onBack: mockOnBack }));

    expect(screen.getByText('Transfer Crypto on Gnosis')).toBeInTheDocument();
    expect(screen.getByText('Bridge Crypto from Ethereum')).toBeInTheDocument();
  });

  it('hides the bridge option when the feature flag is disabled', () => {
    setupMocks({ bridgeEnabled: false });

    render(createElement(SelectPaymentMethod, { onBack: mockOnBack }));

    expect(screen.queryByText('Bridge Crypto from Ethereum')).toBeNull();
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
});
