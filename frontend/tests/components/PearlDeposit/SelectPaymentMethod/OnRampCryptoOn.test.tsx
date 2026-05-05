import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';

import { TokenSymbolMap } from '../../../../config/tokens';
import { EvmChainIdMap } from '../../../../constants/chains';
import { DEFAULT_EOA_ADDRESS } from '../../../helpers/factories';

const mockUsePearlWallet = jest.fn();
const mockUseOnRampContext = jest.fn();
const mockUseGetOnRampRequirementsParams = jest.fn();

jest.mock('../../../../context/PearlWalletProvider', () => ({
  usePearlWallet: () => mockUsePearlWallet(),
}));

jest.mock('../../../../hooks', () => ({
  useGetOnRampRequirementsParams: (...args: unknown[]) =>
    mockUseGetOnRampRequirementsParams(...args),
  useOnRampContext: () => mockUseOnRampContext(),
}));

let onRampProps: Record<string, unknown> | null = null;

jest.mock('../../../../components/OnRamp', () => ({
  OnRamp: (props: Record<string, unknown>) => {
    onRampProps = props;
    return createElement('button', {
      type: 'button',
      'data-testid': 'onramp-component',
      onClick: props.onOnRampCompleted as () => void,
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
  OnRampCryptoOn,
} = require('../../../../components/PearlDeposit/SelectPaymentMethod/OnRampCryptoOn');
/* eslint-enable @typescript-eslint/no-var-requires */

const mockOnBack = jest.fn();
const mockOnReset = jest.fn();
const mockResetOnRampState = jest.fn();
const mockGetOnRampRequest = jest.fn();

const setupMocks = (
  overrides: {
    walletChainId?: number | null;
  } = {},
) => {
  mockUsePearlWallet.mockReturnValue({
    onReset: mockOnReset,
    walletChainId:
      overrides.walletChainId === undefined
        ? EvmChainIdMap.Base
        : overrides.walletChainId,
  });
  mockUseOnRampContext.mockReturnValue({
    resetOnRampState: mockResetOnRampState,
  });
  mockUseGetOnRampRequirementsParams.mockReturnValue(mockGetOnRampRequest);
  mockGetOnRampRequest.mockImplementation(
    (tokenAddress: string, amount: number) => ({
      from: {
        chain: 'base',
        address: DEFAULT_EOA_ADDRESS,
        token: '0x0000000000000000000000000000000000000000',
      },
      to: {
        chain: 'base',
        address: DEFAULT_EOA_ADDRESS,
        token: tokenAddress,
        amount: `${amount}`,
      },
    }),
  );
};

describe('OnRampCryptoOn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onRampProps = null;
    setupMocks();
  });

  it('returns null requirements when no wallet chain is selected', () => {
    setupMocks({ walletChainId: null });

    render(
      createElement(OnRampCryptoOn, {
        onRampChainId: EvmChainIdMap.Base,
        amountsToDeposit: { [TokenSymbolMap.ETH]: { amount: 1 } },
        onBack: mockOnBack,
      }),
    );

    expect(
      (onRampProps?.getOnRampRequirementsParams as () => unknown)(),
    ).toBeNull();
  });

  it('returns null requirements when there are no positive deposit amounts', () => {
    render(
      createElement(OnRampCryptoOn, {
        onRampChainId: EvmChainIdMap.Base,
        amountsToDeposit: { [TokenSymbolMap.ETH]: { amount: 0 } },
        onBack: mockOnBack,
      }),
    );

    expect(
      (onRampProps?.getOnRampRequirementsParams as () => unknown)(),
    ).toBeNull();
  });

  it('builds on-ramp requirements and filters null token requests', () => {
    mockGetOnRampRequest.mockImplementation(
      (tokenAddress: string, amount: number) => {
        if (tokenAddress === '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') {
          return null;
        }

        return {
          from: {
            chain: 'base',
            address: DEFAULT_EOA_ADDRESS,
            token: '0x0000000000000000000000000000000000000000',
          },
          to: {
            chain: 'base',
            address: DEFAULT_EOA_ADDRESS,
            token: tokenAddress,
            amount: `${amount}`,
          },
        };
      },
    );

    render(
      createElement(OnRampCryptoOn, {
        onRampChainId: EvmChainIdMap.Base,
        amountsToDeposit: {
          [TokenSymbolMap.ETH]: { amount: 1 },
          [TokenSymbolMap.USDC]: { amount: 2 },
        },
        onBack: mockOnBack,
      }),
    );

    const result = (
      onRampProps?.getOnRampRequirementsParams as (forceUpdate?: boolean) => {
        bridge_requests: unknown[];
        force_update: boolean;
      }
    )(true);

    expect(result).toEqual({
      bridge_requests: [
        {
          from: {
            chain: 'base',
            address: DEFAULT_EOA_ADDRESS,
            token: '0x0000000000000000000000000000000000000000',
          },
          to: {
            chain: 'base',
            address: DEFAULT_EOA_ADDRESS,
            token: '0x0000000000000000000000000000000000000000',
            amount: '1',
          },
        },
      ],
      force_update: true,
    });
  });

  it('defaults force_update to false when the caller omits it', () => {
    render(
      createElement(OnRampCryptoOn, {
        onRampChainId: EvmChainIdMap.Base,
        amountsToDeposit: { [TokenSymbolMap.ETH]: { amount: 1 } },
        onBack: mockOnBack,
      }),
    );

    const result = (
      onRampProps?.getOnRampRequirementsParams as () => {
        bridge_requests: unknown[];
        force_update: boolean;
      }
    )();

    expect(result.force_update).toBe(false);
  });

  it('throws when a selected token is unavailable on the wallet chain', () => {
    render(
      createElement(OnRampCryptoOn, {
        onRampChainId: EvmChainIdMap.Base,
        amountsToDeposit: { [TokenSymbolMap.XDAI]: { amount: 1 } },
        onBack: mockOnBack,
      }),
    );

    expect(() => {
      (onRampProps?.getOnRampRequirementsParams as () => unknown)();
    }).toThrow('Token XDAI is not supported on chain 8453');
  });

  it('shows the completion modal and clears on-ramp state when finished', () => {
    render(
      createElement(OnRampCryptoOn, {
        onRampChainId: EvmChainIdMap.Base,
        amountsToDeposit: { [TokenSymbolMap.ETH]: { amount: 1 } },
        onBack: mockOnBack,
      }),
    );

    fireEvent.click(screen.getByTestId('onramp-component'));

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Purchase Completed!')).toBeInTheDocument();

    fireEvent.click(screen.getByText('See wallet balance'));

    expect(mockOnReset).toHaveBeenCalledWith(true);
    expect(mockResetOnRampState).toHaveBeenCalledTimes(1);
  });
});
