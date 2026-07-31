import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';

import {
  AllEvmChainIdMap,
  MiddlewareChain,
  MiddlewareChainMap,
} from '../../../../constants/chains';
import { DEFAULT_EOA_ADDRESS, makeMasterEoa } from '../../../helpers/factories';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => createElement('img', props),
}));

const mockUseMasterWalletContext = jest.fn();
const mockAsEvmChainDetails = jest.fn(
  (
    chain: MiddlewareChain,
  ): {
    chainId: number;
    displayName: string;
    name: string;
    symbol: string;
  } => {
    if (chain === MiddlewareChainMap.ETHEREUM) {
      return {
        chainId: AllEvmChainIdMap.Ethereum,
        displayName: 'Ethereum',
        name: 'ethereum',
        symbol: 'ETH',
      };
    }

    return {
      chainId: AllEvmChainIdMap.Base,
      displayName: 'Base',
      name: 'base',
      symbol: 'ETH',
    };
  },
);

jest.mock('../../../../hooks', () => ({
  useMasterWalletContext: () => mockUseMasterWalletContext(),
}));

jest.mock('../../../../utils/middlewareHelpers', () => ({
  asEvmChainDetails: (chain: MiddlewareChain) => mockAsEvmChainDetails(chain),
}));

let fundingDescriptionProps: Record<string, unknown> | null = null;
let depositForBridgingProps: Record<string, unknown> | null = null;

jest.mock('../../../../components/ui', () => ({
  Alert: ({
    message,
    description,
  }: {
    message: React.ReactNode;
    description?: React.ReactNode;
  }) =>
    createElement(
      'div',
      { 'data-testid': 'alert' },
      createElement('div', null, message),
      description ? createElement('div', null, description) : null,
    ),
  BackButton: ({ onPrev }: { onPrev: () => void }) =>
    createElement('button', { onClick: onPrev }, 'Back'),
  CardFlex: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'card-flex' }, children),
  FundingDescription: (props: Record<string, unknown>) => {
    fundingDescriptionProps = props;
    return createElement('div', { 'data-testid': 'funding-description' });
  },
}));

jest.mock(
  '../../../../components/Bridge/BridgeOnEvm/DepositForBridging',
  () => ({
    DepositForBridging: (props: Record<string, unknown>) => {
      depositForBridgingProps = props;
      return createElement('div', { 'data-testid': 'deposit-for-bridging' });
    },
  }),
);

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  BridgeOnEvm,
} = require('../../../../components/Bridge/BridgeOnEvm/BridgeOnEvm');
/* eslint-enable @typescript-eslint/no-var-requires */

const mockOnPrev = jest.fn();
const mockOnNext = jest.fn();
const mockGetBridgeRequirementsParams = jest.fn();
const mockUpdateQuoteId = jest.fn();
const mockUpdateCrossChainTransferDetails = jest.fn();

const defaultProps = {
  fromChain: MiddlewareChainMap.ETHEREUM,
  bridgeToChain: MiddlewareChainMap.GNOSIS,
  onPrev: mockOnPrev,
  onNext: mockOnNext,
  getBridgeRequirementsParams: mockGetBridgeRequirementsParams,
  updateQuoteId: mockUpdateQuoteId,
  updateCrossChainTransferDetails: mockUpdateCrossChainTransferDetails,
  showAgentCustodyAlert: true,
};

describe('BridgeOnEvm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fundingDescriptionProps = null;
    depositForBridgingProps = null;
    mockUseMasterWalletContext.mockReturnValue({
      masterEoa: makeMasterEoa(),
    });
  });

  it('renders the bridge instructions and wallet funding description', () => {
    render(createElement(BridgeOnEvm, defaultProps));

    expect(screen.getByText('Bridge Crypto from Ethereum')).toBeInTheDocument();
    expect(screen.getByText('Step 1. Send Funds')).toBeInTheDocument();
    expect(
      screen.getByText('Only send funds on Ethereum Chain'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your agent can send funds to any address. Consider only funding it with what it needs.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('funding-description')).toBeInTheDocument();
    expect(fundingDescriptionProps).toMatchObject({
      address: DEFAULT_EOA_ADDRESS,
      chainName: 'Ethereum',
      chainImage: '/chains/ethereum-chain.png',
      isMainnet: true,
    });
  });

  it('forwards the bridge orchestration props to DepositForBridging', () => {
    render(createElement(BridgeOnEvm, defaultProps));

    expect(depositForBridgingProps).toMatchObject({
      fromChain: MiddlewareChainMap.ETHEREUM,
      bridgeToChain: MiddlewareChainMap.GNOSIS,
      onNext: mockOnNext,
      getBridgeRequirementsParams: mockGetBridgeRequirementsParams,
      updateQuoteId: mockUpdateQuoteId,
      updateCrossChainTransferDetails: mockUpdateCrossChainTransferDetails,
    });
  });

  it('navigates back when the back button is clicked', () => {
    render(createElement(BridgeOnEvm, defaultProps));

    fireEvent.click(screen.getByText('Back'));

    expect(mockOnPrev).toHaveBeenCalledTimes(1);
  });

  it('hides the agent custody alert when showAgentCustodyAlert is not set', () => {
    render(
      createElement(BridgeOnEvm, {
        ...defaultProps,
        showAgentCustodyAlert: undefined,
      }),
    );

    expect(screen.queryByText('Only send funds on Ethereum Chain')).toBeNull();
    expect(
      screen.queryByText(
        'Your agent can send funds to any address. Consider only funding it with what it needs.',
      ),
    ).toBeNull();
  });

  it('skips the funding description when the master EOA is unavailable', () => {
    mockUseMasterWalletContext.mockReturnValue({ masterEoa: null });

    render(createElement(BridgeOnEvm, defaultProps));

    expect(screen.queryByTestId('funding-description')).toBeNull();
  });
});
