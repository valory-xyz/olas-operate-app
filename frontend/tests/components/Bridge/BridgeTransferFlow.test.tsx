import { render, screen } from '@testing-library/react';
import { createElement } from 'react';

import { MiddlewareChain, MiddlewareChainMap } from '../../../constants/chains';

jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({ providers: [] }));

jest.mock('antd', () => {
  const ListItem = ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children);

  const List = ({
    dataSource,
    header,
    renderItem,
  }: {
    dataSource: unknown[];
    header: React.ReactNode;
    renderItem: (item: unknown, index: number) => React.ReactNode;
  }) =>
    createElement(
      'div',
      null,
      header,
      dataSource.map((item, index) =>
        createElement('div', { key: `row-${index}` }, renderItem(item, index)),
      ),
    );

  List.Item = ListItem;

  return {
    Flex: ({ children }: { children: React.ReactNode }) =>
      createElement('div', null, children),
    List,
    Typography: {
      Text: ({ children }: { children: React.ReactNode }) =>
        createElement('span', null, children),
    },
  };
});

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => createElement('img', props),
}));

const mockAsEvmChainDetails = jest.fn(
  (chain: MiddlewareChain): { name: string; displayName: string } => {
    switch (chain) {
      case MiddlewareChainMap.ETHEREUM:
        return { name: 'ethereum', displayName: 'Ethereum' };
      case MiddlewareChainMap.GNOSIS:
        return { name: 'gnosis', displayName: 'Gnosis' };
      default:
        return { name: 'base', displayName: 'Base' };
    }
  },
);

const mockFormatUnitsToNumber = jest.fn(
  (amount: string, decimals: number, precision: number) => {
    const normalized = Number(amount) / 10 ** decimals;
    return normalized.toFixed(precision).replace(/\.0+$|(?<=\.\d*?)0+$/, '');
  },
);

jest.mock('../../../utils', () => ({
  asEvmChainDetails: (chain: MiddlewareChain) => mockAsEvmChainDetails(chain),
  formatUnitsToNumber: (amount: string, decimals: number, precision: number) =>
    mockFormatUnitsToNumber(amount, decimals, precision),
  parseEther: (value: number) => `${value}`,
}));

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  BridgeTransferFlow,
} = require('../../../components/Bridge/BridgeTransferFlow');
/* eslint-enable @typescript-eslint/no-var-requires */

const defaultProps = {
  fromChain: MiddlewareChainMap.ETHEREUM,
  toChain: MiddlewareChainMap.GNOSIS,
  transfers: [
    {
      fromSymbol: 'ETH',
      toSymbol: 'XDAI',
      fromAmount: '1000000000000000000',
      toAmount: '2000000000000000000',
      decimals: 18,
    },
  ],
};

describe('BridgeTransferFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chain headers and transfer amounts', () => {
    render(createElement(BridgeTransferFlow, defaultProps));

    expect(screen.getByText('Ethereum Chain')).toBeInTheDocument();
    expect(screen.getByText('Gnosis Chain')).toBeInTheDocument();
    expect(screen.getByText('You Sent')).toBeInTheDocument();
    expect(screen.getByText('You Receive')).toBeInTheDocument();
    expect(screen.getByText('1 ETH')).toBeInTheDocument();
    expect(screen.getByText('2 XDAI')).toBeInTheDocument();
    expect(mockFormatUnitsToNumber).toHaveBeenNthCalledWith(
      1,
      '1000000000000000000',
      18,
      5,
    );
    expect(mockFormatUnitsToNumber).toHaveBeenNthCalledWith(
      2,
      '2000000000000000000',
      18,
      5,
    );
  });

  it('switches the receiving label after the bridge completes', () => {
    render(
      createElement(BridgeTransferFlow, {
        ...defaultProps,
        isBridgeCompleted: true,
      }),
    );

    expect(screen.getByText('You Received')).toBeInTheDocument();
    expect(screen.queryByText('You Receive')).toBeNull();
  });
});
