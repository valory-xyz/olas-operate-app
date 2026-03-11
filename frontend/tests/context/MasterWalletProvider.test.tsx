import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, PropsWithChildren, useContext } from 'react';

import { EvmChainIdMap, MiddlewareChainMap } from '../../constants/chains';
import { WALLET_OWNER, WALLET_TYPE } from '../../constants/wallet';
import {
  MasterWalletContext,
  MasterWalletProvider,
} from '../../context/MasterWalletProvider';
import { WalletService } from '../../service/Wallet';
import { MiddlewareWalletResponse } from '../../types/Wallet';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  POLYGON_SAFE_ADDRESS,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
jest.mock('../../constants/providers', () => ({}));

jest.mock('../../service/Wallet', () => ({
  WalletService: {
    getWallets: jest.fn(),
  },
}));

jest.mock('../../context/OnlineStatusProvider', () => ({
  OnlineStatusContext: require('react').createContext({ isOnline: true }),
}));
/* eslint-enable @typescript-eslint/no-var-requires */

const mockGetWallets = WalletService.getWallets as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MasterWalletProvider, null, children),
    );
};

const makeWalletResponse = (
  overrides: Partial<MiddlewareWalletResponse> = {},
): MiddlewareWalletResponse => ({
  address: DEFAULT_EOA_ADDRESS,
  safes: {} as MiddlewareWalletResponse['safes'],
  safe_chains: [],
  ledger_type: 0,
  safe_nonce: 12345,
  ...overrides,
});

describe('MasterWalletProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('derives masterEoa from wallet response', async () => {
    mockGetWallets.mockResolvedValue([makeWalletResponse()]);

    const { result } = renderHook(
      () => {
        return useContext(MasterWalletContext);
      },
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.masterEoa).toBeDefined();
    });
    expect(result.current.masterEoa?.address).toBe(DEFAULT_EOA_ADDRESS);
    expect(result.current.masterEoa?.type).toBe(WALLET_TYPE.EOA);
    expect(result.current.masterEoa?.owner).toBe(WALLET_OWNER.Master);
  });

  it('derives masterSafes from wallet response safes', async () => {
    mockGetWallets.mockResolvedValue([
      makeWalletResponse({
        safes: {
          [MiddlewareChainMap.GNOSIS]: DEFAULT_SAFE_ADDRESS,
        } as MiddlewareWalletResponse['safes'],
        safe_chains: [MiddlewareChainMap.GNOSIS],
      }),
    ]);

    const { result } = renderHook(
      () => {
        return useContext(MasterWalletContext);
      },
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.masterSafes?.length).toBe(1);
    });
    const safe = result.current.masterSafes![0];
    expect(safe.address).toBe(DEFAULT_SAFE_ADDRESS);
    expect(safe.type).toBe(WALLET_TYPE.Safe);
    expect(safe.owner).toBe(WALLET_OWNER.Master);
    expect(safe.evmChainId).toBe(EvmChainIdMap.Gnosis);
  });

  it('derives multiple safes across chains', async () => {
    mockGetWallets.mockResolvedValue([
      makeWalletResponse({
        safes: {
          [MiddlewareChainMap.GNOSIS]: DEFAULT_SAFE_ADDRESS,
          [MiddlewareChainMap.POLYGON]: POLYGON_SAFE_ADDRESS,
        } as MiddlewareWalletResponse['safes'],
      }),
    ]);

    const { result } = renderHook(
      () => {
        return useContext(MasterWalletContext);
      },
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.masterSafes?.length).toBe(2);
    });
    const chainIds = result.current.masterSafes!.map((s) => s.evmChainId);
    expect(chainIds).toContain(EvmChainIdMap.Gnosis);
    expect(chainIds).toContain(EvmChainIdMap.Polygon);
  });

  it('getMasterSafeOf returns safe for the specified chain', async () => {
    mockGetWallets.mockResolvedValue([
      makeWalletResponse({
        safes: {
          [MiddlewareChainMap.GNOSIS]: DEFAULT_SAFE_ADDRESS,
        } as MiddlewareWalletResponse['safes'],
      }),
    ]);

    const { result } = renderHook(
      () => {
        return useContext(MasterWalletContext);
      },
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.masterSafes?.length).toBe(1);
    });
    const gnosisSafe = result.current.getMasterSafeOf!(EvmChainIdMap.Gnosis);
    expect(gnosisSafe?.address).toBe(DEFAULT_SAFE_ADDRESS);
  });

  it('getMasterSafeOf returns undefined for a chain with no safe', async () => {
    mockGetWallets.mockResolvedValue([
      makeWalletResponse({
        safes: {
          [MiddlewareChainMap.GNOSIS]: DEFAULT_SAFE_ADDRESS,
        } as MiddlewareWalletResponse['safes'],
      }),
    ]);

    const { result } = renderHook(
      () => {
        return useContext(MasterWalletContext);
      },
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.masterSafes?.length).toBe(1);
    });
    const polygonSafe = result.current.getMasterSafeOf!(EvmChainIdMap.Polygon);
    expect(polygonSafe).toBeUndefined();
  });

  it('returns default empty context when no provider wraps it', () => {
    const { result } = renderHook(() => {
      return useContext(MasterWalletContext);
    });

    expect(result.current.masterEoa).toBeUndefined();
    expect(result.current.masterSafes).toBeUndefined();
    expect(result.current.getMasterSafeOf).toBeUndefined();
  });

  it('returns masterWallets including both EOA and safes', async () => {
    mockGetWallets.mockResolvedValue([
      makeWalletResponse({
        safes: {
          [MiddlewareChainMap.GNOSIS]: DEFAULT_SAFE_ADDRESS,
        } as MiddlewareWalletResponse['safes'],
      }),
    ]);

    const { result } = renderHook(
      () => {
        return useContext(MasterWalletContext);
      },
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.masterWallets?.length).toBe(2);
    });
    const types = result.current.masterWallets!.map((w) => w.type);
    expect(types).toContain(WALLET_TYPE.EOA);
    expect(types).toContain(WALLET_TYPE.Safe);
  });
});
