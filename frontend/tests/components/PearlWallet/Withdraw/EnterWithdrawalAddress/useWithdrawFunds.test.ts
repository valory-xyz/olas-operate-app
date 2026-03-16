import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { useWithdrawFunds } from '../../../../../components/PearlWallet/Withdraw/EnterWithdrawalAddress/useWithdrawFunds';
import {
  GNOSIS_TOKEN_CONFIG,
  TokenSymbolMap,
} from '../../../../../config/tokens';
import { AddressZero } from '../../../../../constants/address';
import { EvmChainIdMap } from '../../../../../constants/chains';
import { usePearlWallet } from '../../../../../context/PearlWalletProvider';
import {
  BACKUP_SIGNER_ADDRESS,
  MOCK_TX_HASH_1,
  MOCK_TX_HASH_2,
} from '../../../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../../constants/providers', () => ({}));

jest.mock('../../../../../context/PearlWalletProvider', () => ({
  usePearlWallet: jest.fn(),
}));

jest.mock('../../../../../config/chains', () => ({
  CHAIN_CONFIG: {
    100: { middlewareChain: 'gnosis', name: 'Gnosis' },
    137: { middlewareChain: 'polygon', name: 'Polygon' },
  },
}));

jest.mock('../../../../../utils/middlewareHelpers', () => ({
  asMiddlewareChain: jest.fn((chainId: number) => {
    const map: Record<number, string> = { 100: 'gnosis', 137: 'polygon' };
    return map[chainId];
  }),
}));

const mockUsePearlWallet = usePearlWallet as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useWithdrawFunds (PearlWallet)', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToWithdraw: {},
      availableAssets: [],
    });
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns initial state with isLoading=false and empty txnHashes', () => {
    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.txnHashes).toEqual([]);
  });

  it('sends withdrawal request with formatted assets', async () => {
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToWithdraw: {
        [TokenSymbolMap.XDAI]: { amount: 1.5 },
      },
      availableAssets: [],
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success', transfer_txs: {} }),
    });

    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.onAuthorizeWithdrawal(
        BACKUP_SIGNER_ADDRESS,
        'password123',
      );
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/wallet/withdraw');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(body.password).toBe('password123');
    expect(body.to).toBe(BACKUP_SIGNER_ADDRESS);
    expect(body.withdraw_assets).toHaveProperty('gnosis');
    // XDAI is NativeGas → AddressZero key
    expect(body.withdraw_assets.gnosis).toHaveProperty(AddressZero);
  });

  it('uses ERC20 token address for non-native tokens', async () => {
    const olasAddress = GNOSIS_TOKEN_CONFIG.OLAS!.address!;

    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToWithdraw: {
        [TokenSymbolMap.OLAS]: { amount: 100 },
      },
      availableAssets: [],
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success', transfer_txs: {} }),
    });

    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.onAuthorizeWithdrawal(
        BACKUP_SIGNER_ADDRESS,
        'password123',
      );
    });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.withdraw_assets.gnosis).toHaveProperty(olasAddress);
  });

  it('skips tokens with zero or negative amounts', async () => {
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToWithdraw: {
        [TokenSymbolMap.XDAI]: { amount: 0 },
        [TokenSymbolMap.OLAS]: { amount: -1 },
      },
      availableAssets: [],
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success', transfer_txs: {} }),
    });

    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.onAuthorizeWithdrawal(BACKUP_SIGNER_ADDRESS, 'pass');
    });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(Object.keys(body.withdraw_assets.gnosis)).toHaveLength(0);
  });

  it('does nothing when walletChainId is null', async () => {
    mockUsePearlWallet.mockReturnValue({
      walletChainId: null,
      amountsToWithdraw: {},
      availableAssets: [],
    });

    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.onAuthorizeWithdrawal(BACKUP_SIGNER_ADDRESS, 'pass');
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('extracts txnHashes from successful response', async () => {
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToWithdraw: {
        [TokenSymbolMap.XDAI]: { amount: 1 },
      },
      availableAssets: [],
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        message: 'Success',
        transfer_txs: {
          gnosis: {
            [AddressZero]: [MOCK_TX_HASH_1, MOCK_TX_HASH_2],
          },
        },
      }),
    });

    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.onAuthorizeWithdrawal(BACKUP_SIGNER_ADDRESS, 'pass');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.txnHashes).toHaveLength(2);
    expect(result.current.txnHashes[0]).toContain(MOCK_TX_HASH_1);
    expect(result.current.txnHashes[1]).toContain(MOCK_TX_HASH_2);
  });

  it('sets isError=true when API returns non-ok response', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToWithdraw: {
        [TokenSymbolMap.XDAI]: { amount: 1 },
      },
      availableAssets: [],
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.onAuthorizeWithdrawal(
        BACKUP_SIGNER_ADDRESS,
        'password123',
      );
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    consoleSpy.mockRestore();
  });

  it('skips tokens not in chain config', async () => {
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToWithdraw: {
        // A symbol that does not exist in Gnosis TOKEN_CONFIG
        ['FAKE_TOKEN' as never]: { amount: 100 },
      },
      availableAssets: [],
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success', transfer_txs: {} }),
    });
    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.onAuthorizeWithdrawal(BACKUP_SIGNER_ADDRESS, 'pass');
    });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(Object.keys(body.withdraw_assets.gnosis)).toHaveLength(0);
  });

  it('falls back to "0" when withdrawAll is true but asset is not found', async () => {
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToWithdraw: {
        [TokenSymbolMap.XDAI]: { amount: 1, withdrawAll: true },
      },
      availableAssets: [], // no matching asset
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success', transfer_txs: {} }),
    });
    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.onAuthorizeWithdrawal(BACKUP_SIGNER_ADDRESS, 'pass');
    });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    // Should use '0' as the fallback amount
    const xdaiAmount = body.withdraw_assets.gnosis[AddressZero];
    expect(xdaiAmount).toBe('0');
  });

  it('returns empty txnHashes when chainTxs is missing in response', async () => {
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToWithdraw: {
        [TokenSymbolMap.XDAI]: { amount: 1 },
      },
      availableAssets: [],
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        message: 'Success',
        transfer_txs: {
          // No gnosis key — chainTxs will be undefined
          polygon: { [AddressZero]: [MOCK_TX_HASH_1] },
        },
      }),
    });
    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.onAuthorizeWithdrawal(BACKUP_SIGNER_ADDRESS, 'pass');
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.txnHashes).toEqual([]);
  });

  it('returns empty txnHashes when walletChainId is null after success', async () => {
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToWithdraw: { [TokenSymbolMap.XDAI]: { amount: 1 } },
      availableAssets: [],
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        message: 'Success',
        transfer_txs: { gnosis: { [AddressZero]: [MOCK_TX_HASH_1] } },
      }),
    });
    const { result, rerender } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.onAuthorizeWithdrawal(BACKUP_SIGNER_ADDRESS, 'pass');
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    // Now change walletChainId to null and re-render
    mockUsePearlWallet.mockReturnValue({
      walletChainId: null,
      amountsToWithdraw: {},
      availableAssets: [],
    });
    act(() => {
      rerender();
    });
    expect(result.current.txnHashes).toEqual([]);
  });

  it('returns empty txnHashes when transfer_txs is undefined', async () => {
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToWithdraw: { [TokenSymbolMap.XDAI]: { amount: 1 } },
      availableAssets: [],
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        message: 'Success',
        transfer_txs: undefined,
      }),
    });
    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.onAuthorizeWithdrawal(BACKUP_SIGNER_ADDRESS, 'pass');
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.txnHashes).toEqual([]);
  });

  it('uses full available amount when withdrawAll is true', async () => {
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      amountsToWithdraw: {
        [TokenSymbolMap.XDAI]: { amount: 1, withdrawAll: true },
      },
      availableAssets: [
        { symbol: TokenSymbolMap.XDAI, amount: 5.5, amountInStr: '5.5' },
      ],
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success', transfer_txs: {} }),
    });

    const { result } = renderHook(() => useWithdrawFunds(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.onAuthorizeWithdrawal(BACKUP_SIGNER_ADDRESS, 'pass');
    });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    // Should use the full available amount (5.5 XDAI in wei), not the input amount (1)
    const xdaiAmount = body.withdraw_assets.gnosis[AddressZero];
    expect(BigInt(xdaiAmount)).toBe(BigInt('5500000000000000000'));
  });
});
