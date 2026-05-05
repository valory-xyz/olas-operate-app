import { render } from '@testing-library/react';
import { createElement } from 'react';

const mockUsePearlWallet = jest.fn();

jest.mock('../../../../context/PearlWalletProvider', () => ({
  usePearlWallet: () => mockUsePearlWallet(),
}));

let transferProps: Record<string, unknown> | null = null;

jest.mock('../../../../components/PearlWallet', () => ({
  TransferCryptoFromExternalWallet: (props: Record<string, unknown>) => {
    transferProps = props;
    return createElement('div', { 'data-testid': 'transfer-wallet' });
  },
}));

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  TransferCryptoOn,
} = require('../../../../components/PearlDeposit/SelectPaymentMethod/TransferCryptoOn');
/* eslint-enable @typescript-eslint/no-var-requires */

const mockOnBack = jest.fn();
const mockGotoPearlWallet = jest.fn();

describe('TransferCryptoOn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transferProps = null;
    mockUsePearlWallet.mockReturnValue({
      amountsToDeposit: {
        ETH: { amount: 1 },
      },
      masterSafeAddress: '0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD',
      gotoPearlWallet: mockGotoPearlWallet,
    });
  });

  it('passes the transfer details to the shared external-wallet component', () => {
    render(
      createElement(TransferCryptoOn, {
        chainName: 'Base',
        onBack: mockOnBack,
      }),
    );

    expect(transferProps).toMatchObject({
      chainName: 'Base',
      address: '0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD',
      tokensToDeposit: [{ symbol: 'ETH', amount: 1 }],
      onBack: mockOnBack,
      onBackToPearlWallet: mockGotoPearlWallet,
    });
    expect(transferProps?.description).toBe(
      'Send the specified amounts from your external wallet to the Pearl Wallet address below. When you’re done, you can leave this screen — after the transfer confirms on Base, your Pearl Wallet balance updates automatically.',
    );
  });
});
