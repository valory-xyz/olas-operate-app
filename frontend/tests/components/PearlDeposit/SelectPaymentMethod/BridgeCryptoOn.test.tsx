import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';

import { TokenSymbolMap } from '../../../../config/tokens';
import { AddressZero } from '../../../../constants/address';
import {
  EvmChainIdMap,
  MiddlewareChainMap,
} from '../../../../constants/chains';
import {
  DEFAULT_EOA_ADDRESS,
  GNOSIS_SAFE_ADDRESS,
  makeMasterEoa,
  makeMasterSafe,
} from '../../../helpers/factories';

jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({ providers: [] }));

const mockUsePearlWallet = jest.fn();
const mockUseMasterWalletContext = jest.fn();
const mockGetFromToken = jest.fn(
  (tokenAddress?: string) => tokenAddress ?? AddressZero,
);
const mockGetTokenDecimal = jest.fn((tokenAddress?: string) => {
  void tokenAddress;
  return 18;
});
const mockParseUnits = jest.fn(
  (amount: number, decimals: number) => `${amount}-${decimals}`,
);
const mockAsEvmChainId = jest.fn((chain: string) => {
  if (chain === MiddlewareChainMap.GNOSIS) return EvmChainIdMap.Gnosis;
  return EvmChainIdMap.Base;
});

jest.mock('../../../../context/PearlWalletProvider', () => ({
  usePearlWallet: () => mockUsePearlWallet(),
}));

jest.mock('../../../../hooks', () => ({
  useMasterWalletContext: () => mockUseMasterWalletContext(),
}));

jest.mock('../../../../utils', () => ({
  asEvmChainId: (chain: string) => mockAsEvmChainId(chain),
  getFromToken: (tokenAddress?: string) => mockGetFromToken(tokenAddress),
  getTokenDecimal: (tokenAddress: string) => mockGetTokenDecimal(tokenAddress),
  parseUnits: (amount: number, decimals: number) =>
    mockParseUnits(amount, decimals),
  parseEther: (value: number) => `${value}`,
}));

let bridgeProps: Record<string, unknown> | null = null;

jest.mock('../../../../components/Bridge', () => ({
  Bridge: (props: Record<string, unknown>) => {
    bridgeProps = props;
    return createElement('button', {
      type: 'button',
      'data-testid': 'bridge-component',
      onClick: props.onBridgingCompleted as () => void,
    });
  },
}));

jest.mock('../../../../components/custom-icons', () => ({
  SuccessOutlined: () =>
    createElement('div', { 'data-testid': 'success-icon' }),
}));

jest.mock('../../../../components/ui', () => ({
  Modal: ({
    title,
    description,
    action,
  }: {
    title: string;
    description: string;
    action: React.ReactNode;
  }) =>
    createElement(
      'div',
      { 'data-testid': 'modal' },
      createElement('h2', null, title),
      createElement('p', null, description),
      action,
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
}));

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  BridgeCryptoOn,
} = require('../../../../components/PearlDeposit/SelectPaymentMethod/BridgeCryptoOn');
/* eslint-enable @typescript-eslint/no-var-requires */

const mockOnBack = jest.fn();
const mockOnReset = jest.fn();
const mockGetMasterSafeOf = jest.fn();

const setupMocks = () => {
  mockUsePearlWallet.mockReturnValue({ onReset: mockOnReset });
  mockGetMasterSafeOf.mockImplementation((chainId: number) => {
    if (chainId === EvmChainIdMap.Gnosis) {
      return makeMasterSafe(EvmChainIdMap.Gnosis, GNOSIS_SAFE_ADDRESS);
    }

    return undefined;
  });
  mockUseMasterWalletContext.mockReturnValue({
    masterEoa: makeMasterEoa(DEFAULT_EOA_ADDRESS),
    getMasterSafeOf: mockGetMasterSafeOf,
    isFetched: true,
  });
};

describe('BridgeCryptoOn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bridgeProps = null;
    setupMocks();
  });

  it('builds bridge requests from the selected deposit amounts', () => {
    render(
      createElement(BridgeCryptoOn, {
        bridgeToChain: MiddlewareChainMap.GNOSIS,
        amountsToDeposit: {
          [TokenSymbolMap.XDAI]: { amount: 1.5 },
          [TokenSymbolMap.OLAS]: { amount: 2 },
        },
        onBack: mockOnBack,
      }),
    );

    const request = (
      bridgeProps?.getBridgeRequirementsParams as (forceUpdate?: boolean) => {
        bridge_requests: unknown[];
        force_update: boolean;
      }
    )(true);

    expect(request).toEqual({
      bridge_requests: [
        {
          from: {
            chain: MiddlewareChainMap.ETHEREUM,
            address: DEFAULT_EOA_ADDRESS,
            token: AddressZero,
          },
          to: {
            chain: MiddlewareChainMap.GNOSIS,
            address: GNOSIS_SAFE_ADDRESS,
            token: AddressZero,
            amount: '1.5-18',
          },
        },
        {
          from: {
            chain: MiddlewareChainMap.ETHEREUM,
            address: DEFAULT_EOA_ADDRESS,
            token: '0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f',
          },
          to: {
            chain: MiddlewareChainMap.GNOSIS,
            address: GNOSIS_SAFE_ADDRESS,
            token: '0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f',
            amount: '2-18',
          },
        },
      ],
      force_update: true,
    });
    expect(bridgeProps?.onPrevBeforeBridging).toBe(mockOnBack);
  });

  it('defaults force_update to false when the caller does not provide it', () => {
    render(
      createElement(BridgeCryptoOn, {
        bridgeToChain: MiddlewareChainMap.GNOSIS,
        amountsToDeposit: {
          [TokenSymbolMap.XDAI]: { amount: 1 },
        },
        onBack: mockOnBack,
      }),
    );

    const request = (
      bridgeProps?.getBridgeRequirementsParams as () => {
        bridge_requests: unknown[];
        force_update: boolean;
      }
    )();

    expect(request.force_update).toBe(false);
  });

  it('throws when no positive deposit amount is available', () => {
    render(
      createElement(BridgeCryptoOn, {
        bridgeToChain: MiddlewareChainMap.GNOSIS,
        amountsToDeposit: {
          [TokenSymbolMap.XDAI]: { amount: 0 },
        },
        onBack: mockOnBack,
      }),
    );

    expect(() => {
      (bridgeProps?.getBridgeRequirementsParams as () => unknown)();
    }).toThrow('No amounts to deposit');
  });

  it('throws when the master EOA is unavailable', () => {
    mockUseMasterWalletContext.mockReturnValue({
      masterEoa: null,
      getMasterSafeOf: mockGetMasterSafeOf,
      isFetched: true,
    });

    render(
      createElement(BridgeCryptoOn, {
        bridgeToChain: MiddlewareChainMap.GNOSIS,
        amountsToDeposit: {
          [TokenSymbolMap.XDAI]: { amount: 1 },
        },
        onBack: mockOnBack,
      }),
    );

    expect(() => {
      (bridgeProps?.getBridgeRequirementsParams as () => unknown)();
    }).toThrow('Master EOA is not available');
  });

  it('throws when the destination master safe is not loaded yet', () => {
    mockUseMasterWalletContext.mockReturnValue({
      masterEoa: makeMasterEoa(DEFAULT_EOA_ADDRESS),
      getMasterSafeOf: mockGetMasterSafeOf,
      isFetched: false,
    });

    render(
      createElement(BridgeCryptoOn, {
        bridgeToChain: MiddlewareChainMap.GNOSIS,
        amountsToDeposit: {
          [TokenSymbolMap.XDAI]: { amount: 1 },
        },
        onBack: mockOnBack,
      }),
    );

    expect(() => {
      (bridgeProps?.getBridgeRequirementsParams as () => unknown)();
    }).toThrow('Master Safe not loaded');
  });

  it('throws when the destination master safe is missing', () => {
    mockUseMasterWalletContext.mockReturnValue({
      masterEoa: makeMasterEoa(DEFAULT_EOA_ADDRESS),
      getMasterSafeOf: () => undefined,
      isFetched: true,
    });

    render(
      createElement(BridgeCryptoOn, {
        bridgeToChain: MiddlewareChainMap.GNOSIS,
        amountsToDeposit: {
          [TokenSymbolMap.XDAI]: { amount: 1 },
        },
        onBack: mockOnBack,
      }),
    );

    expect(() => {
      (bridgeProps?.getBridgeRequirementsParams as () => unknown)();
    }).toThrow('Master Safe is not available');
  });

  it('throws when a requested token is not supported on the destination chain', () => {
    render(
      createElement(BridgeCryptoOn, {
        bridgeToChain: MiddlewareChainMap.GNOSIS,
        amountsToDeposit: {
          [TokenSymbolMap.ETH]: { amount: 1 },
        },
        onBack: mockOnBack,
      }),
    );

    expect(() => {
      (bridgeProps?.getBridgeRequirementsParams as () => unknown)();
    }).toThrow('Token ETH is not supported on gnosis');
  });

  it('shows the completion modal and resets the wallet when the user finishes', () => {
    render(
      createElement(BridgeCryptoOn, {
        bridgeToChain: MiddlewareChainMap.GNOSIS,
        amountsToDeposit: {
          [TokenSymbolMap.XDAI]: { amount: 1 },
        },
        onBack: mockOnBack,
      }),
    );

    fireEvent.click(screen.getByTestId('bridge-component'));

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Bridge Completed!')).toBeInTheDocument();

    fireEvent.click(screen.getByText('See wallet balance'));

    expect(mockOnReset).toHaveBeenCalledWith(true);
  });
});
