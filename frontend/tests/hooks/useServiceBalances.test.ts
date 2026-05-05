import { renderHook } from '@testing-library/react';

import { TokenSymbolMap } from '../../config/tokens';
import { EvmChainIdMap } from '../../constants/chains';
import { WALLET_OWNER, WALLET_TYPE } from '../../constants/wallet';
import { useBalanceContext } from '../../hooks/useBalanceContext';
import { useService } from '../../hooks/useService';
import { useServiceBalances } from '../../hooks/useServiceBalances';
import { useServices } from '../../hooks/useServices';
import { WalletBalance } from '../../types/Balance';
import {
  AGENT_KEY_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  DEFAULT_SERVICE_CONFIG_ID,
  SECOND_SAFE_ADDRESS,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));
jest.mock('../../hooks/useService', () => ({
  useService: jest.fn(),
}));
jest.mock('../../hooks/useBalanceContext', () => ({
  useBalanceContext: jest.fn(),
}));

const mockUseServices = useServices as jest.Mock;
const mockUseService = useService as jest.Mock;
const mockUseBalanceContext = useBalanceContext as jest.Mock;

// --- Wallet balance fixtures ---

const gnosisSafeNativeBalance: WalletBalance = {
  walletAddress: DEFAULT_SAFE_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap.XDAI,
  isNative: true,
  balance: 5.0,
  balanceString: '5.0',
};

const gnosisSafeOlasBalance: WalletBalance = {
  walletAddress: DEFAULT_SAFE_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap.OLAS,
  isNative: false,
  balance: 100.0,
  balanceString: '100.0',
};

const gnosisSafeWxdaiBalance: WalletBalance = {
  walletAddress: DEFAULT_SAFE_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap.WXDAI,
  isNative: false,
  balance: 20.0,
  balanceString: '20.0',
  isWrappedToken: true,
};

const gnosisSafeUsdceBalance: WalletBalance = {
  walletAddress: DEFAULT_SAFE_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap['USDC.e'],
  isNative: false,
  balance: 50.0,
  balanceString: '50.0',
};

const baseSafeNativeBalance: WalletBalance = {
  walletAddress: DEFAULT_SAFE_ADDRESS,
  evmChainId: EvmChainIdMap.Base,
  symbol: TokenSymbolMap.ETH,
  isNative: true,
  balance: 0.5,
  balanceString: '0.5',
};

const baseSafeOlasBalance: WalletBalance = {
  walletAddress: DEFAULT_SAFE_ADDRESS,
  evmChainId: EvmChainIdMap.Base,
  symbol: TokenSymbolMap.OLAS,
  isNative: false,
  balance: 10.0,
  balanceString: '10.0',
};

const eoaNativeBalance: WalletBalance = {
  walletAddress: AGENT_KEY_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap.XDAI,
  isNative: true,
  balance: 1.0,
  balanceString: '1.0',
};

const eoaOlasBalance: WalletBalance = {
  walletAddress: AGENT_KEY_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap.OLAS,
  isNative: false,
  balance: 25.0,
  balanceString: '25.0',
};

const eoaUsdceBalance: WalletBalance = {
  walletAddress: AGENT_KEY_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap['USDC.e'],
  isNative: false,
  balance: 30.0,
  balanceString: '30.0',
};

const eoaBaseNativeBalance: WalletBalance = {
  walletAddress: AGENT_KEY_ADDRESS,
  evmChainId: EvmChainIdMap.Base,
  symbol: TokenSymbolMap.ETH,
  isNative: true,
  balance: 0.1,
  balanceString: '0.1',
};

const unrelatedBalance: WalletBalance = {
  walletAddress: SECOND_SAFE_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap.XDAI,
  isNative: true,
  balance: 999,
  balanceString: '999.0',
};

// All balances combined
const allBalances: WalletBalance[] = [
  gnosisSafeNativeBalance,
  gnosisSafeOlasBalance,
  gnosisSafeWxdaiBalance,
  gnosisSafeUsdceBalance,
  baseSafeNativeBalance,
  baseSafeOlasBalance,
  eoaNativeBalance,
  eoaOlasBalance,
  eoaUsdceBalance,
  eoaBaseNativeBalance,
  unrelatedBalance,
];

// --- Default mock setup ---

type SetupMocksOptions = {
  evmHomeChainId?: number;
  serviceSafes?: Array<{
    address: string;
    owner: string;
    type: string;
    evmChainId: number;
  }>;
  serviceEoa?: { address: string; owner: string; type: string } | null;
  walletBalances?: WalletBalance[] | null;
  isLoading?: boolean;
};

const DEFAULT_SERVICE_SAFES = [
  {
    address: DEFAULT_SAFE_ADDRESS,
    owner: WALLET_OWNER.Agent,
    type: WALLET_TYPE.Safe,
    evmChainId: EvmChainIdMap.Gnosis,
  },
];

const DEFAULT_SERVICE_EOA = {
  address: AGENT_KEY_ADDRESS,
  owner: WALLET_OWNER.Agent,
  type: WALLET_TYPE.EOA,
};

const setupMocks = (options: SetupMocksOptions = {}) => {
  const {
    evmHomeChainId = EvmChainIdMap.Gnosis,
    serviceSafes = DEFAULT_SERVICE_SAFES,
    serviceEoa = DEFAULT_SERVICE_EOA,
    walletBalances = allBalances,
    isLoading = false,
  } = options;

  mockUseServices.mockReturnValue({
    selectedAgentConfig:
      evmHomeChainId !== undefined ? { evmHomeChainId } : undefined,
  });
  mockUseService.mockReturnValue({ serviceSafes, serviceEoa });
  mockUseBalanceContext.mockReturnValue({
    // null means "explicitly no balances" (pass undefined to the hook)
    walletBalances: walletBalances === null ? undefined : walletBalances,
    isLoading,
  });
};

describe('useServiceBalances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('serviceSafeBalances', () => {
    it('returns balances matching service safe addresses', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      const safeBalances = result.current.serviceSafeBalances;
      expect(safeBalances).toBeDefined();
      expect(safeBalances!.length).toBe(6);
      expect(
        safeBalances!.every(
          (b) =>
            b.walletAddress.toLowerCase() ===
            DEFAULT_SAFE_ADDRESS.toLowerCase(),
        ),
      ).toBe(true);
    });

    it('excludes balances from unrelated addresses', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(
        result.current.serviceSafeBalances!.some(
          (b) =>
            b.walletAddress.toLowerCase() === SECOND_SAFE_ADDRESS.toLowerCase(),
        ),
      ).toBe(false);
    });

    it('returns undefined when walletBalances is undefined', () => {
      setupMocks({ walletBalances: null });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceSafeBalances).toBeUndefined();
    });

    it('returns empty array when no safes match', () => {
      setupMocks({ serviceSafes: [] });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceSafeBalances).toEqual([]);
    });

    it('matches addresses case-insensitively', () => {
      const lowerCaseBalance: WalletBalance = {
        ...gnosisSafeNativeBalance,
        walletAddress: DEFAULT_SAFE_ADDRESS.toLowerCase() as `0x${string}`,
      };
      setupMocks({ walletBalances: [lowerCaseBalance] });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceSafeBalances).toHaveLength(1);
      expect(result.current.serviceSafeBalances![0]).toBe(lowerCaseBalance);
    });
  });

  describe('serviceSafeOlas', () => {
    it('returns OLAS balance on home chain', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceSafeOlas).toBe(gnosisSafeOlasBalance);
    });

    it('does not return OLAS from a different chain', () => {
      setupMocks({ walletBalances: [baseSafeOlasBalance] });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceSafeOlas).toBeUndefined();
    });

    it('returns undefined when no OLAS balance exists', () => {
      setupMocks({
        walletBalances: [gnosisSafeNativeBalance, gnosisSafeWxdaiBalance],
      });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceSafeOlas).toBeUndefined();
    });

    it('returns undefined when walletBalances is undefined', () => {
      setupMocks({ walletBalances: null });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceSafeOlas).toBeUndefined();
    });
  });

  describe('serviceSafeNativeBalances', () => {
    it('returns native balances on home chain only', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      const nativeBalances = result.current.serviceSafeNativeBalances;
      expect(nativeBalances).toHaveLength(1);
      expect(nativeBalances![0]).toBe(gnosisSafeNativeBalance);
    });

    it('excludes native balances from other chains', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(
        result.current.serviceSafeNativeBalances!.some(
          (b) => b.evmChainId === EvmChainIdMap.Base,
        ),
      ).toBe(false);
    });

    it('excludes non-native balances', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(
        result.current.serviceSafeNativeBalances!.every((b) => b.isNative),
      ).toBe(true);
    });

    it('returns null when serviceSafeBalances is undefined', () => {
      setupMocks({ walletBalances: null });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceSafeNativeBalances).toBeNull();
    });

    it('returns empty array when no native home-chain balances exist', () => {
      setupMocks({
        walletBalances: [gnosisSafeOlasBalance, gnosisSafeWxdaiBalance],
      });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceSafeNativeBalances).toEqual([]);
    });
  });

  describe('serviceSafeErc20Balances', () => {
    it('returns non-native, non-OLAS balances on home chain', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      const erc20s = result.current.serviceSafeErc20Balances;
      expect(erc20s).toBeDefined();
      expect(erc20s!.length).toBe(2);
      expect(erc20s).toContainEqual(gnosisSafeWxdaiBalance);
      expect(erc20s).toContainEqual(gnosisSafeUsdceBalance);
    });

    it('excludes OLAS from ERC20 results', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(
        result.current.serviceSafeErc20Balances!.some(
          (b) => b.symbol === TokenSymbolMap.OLAS,
        ),
      ).toBe(false);
    });

    it('excludes native tokens from ERC20 results', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(
        result.current.serviceSafeErc20Balances!.every((b) => !b.isNative),
      ).toBe(true);
    });

    it('excludes balances from other chains', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(
        result.current.serviceSafeErc20Balances!.every(
          (b) => b.evmChainId === EvmChainIdMap.Gnosis,
        ),
      ).toBe(true);
    });

    it('returns undefined when walletBalances is undefined', () => {
      setupMocks({ walletBalances: null });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceSafeErc20Balances).toBeUndefined();
    });

    it('returns empty array when only OLAS and native exist', () => {
      setupMocks({
        walletBalances: [gnosisSafeNativeBalance, gnosisSafeOlasBalance],
      });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceSafeErc20Balances).toEqual([]);
    });
  });

  describe('serviceEoaNativeBalance', () => {
    it('returns native EOA balance on home chain', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceEoaNativeBalance).toBe(eoaNativeBalance);
    });

    it('does not return EOA native balance from other chains', () => {
      setupMocks({ walletBalances: [eoaBaseNativeBalance] });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceEoaNativeBalance).toBeUndefined();
    });

    it('returns undefined when no EOA native balance on home chain exists', () => {
      setupMocks({ walletBalances: [eoaOlasBalance, eoaUsdceBalance] });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceEoaNativeBalance).toBeUndefined();
    });

    it('returns undefined when walletBalances is undefined', () => {
      setupMocks({ walletBalances: null });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceEoaNativeBalance).toBeUndefined();
    });

    it('returns undefined when serviceEoa is null', () => {
      setupMocks({ serviceEoa: null });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceEoaNativeBalance).toBeUndefined();
    });
  });

  describe('serviceEoaErc20Balances', () => {
    it('returns non-native, non-OLAS EOA balances on home chain', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      const eoaErc20s = result.current.serviceEoaErc20Balances;
      expect(eoaErc20s).toBeDefined();
      expect(eoaErc20s).toHaveLength(1);
      expect(eoaErc20s![0]).toBe(eoaUsdceBalance);
    });

    it('excludes OLAS from EOA ERC20 results', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(
        result.current.serviceEoaErc20Balances!.some(
          (b) => b.symbol === TokenSymbolMap.OLAS,
        ),
      ).toBe(false);
    });

    it('excludes native tokens from EOA ERC20 results', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(
        result.current.serviceEoaErc20Balances!.every((b) => !b.isNative),
      ).toBe(true);
    });

    it('excludes EOA ERC20 balances from other chains', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(
        result.current.serviceEoaErc20Balances!.every(
          (b) => b.evmChainId === EvmChainIdMap.Gnosis,
        ),
      ).toBe(true);
    });

    it('returns undefined when walletBalances is undefined', () => {
      setupMocks({ walletBalances: null });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceEoaErc20Balances).toBeUndefined();
    });

    it('returns empty array when only OLAS and native exist for EOA', () => {
      setupMocks({
        walletBalances: [eoaNativeBalance, eoaOlasBalance],
      });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceEoaErc20Balances).toEqual([]);
    });
  });

  describe('isLoading', () => {
    it('returns isLoading from balance context', () => {
      setupMocks({ isLoading: true });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.isLoading).toBe(true);
    });

    it('returns false when not loading', () => {
      setupMocks({ isLoading: false });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles undefined serviceConfigId', () => {
      const { result } = renderHook(() => useServiceBalances(undefined));
      // Hook still runs, useService receives undefined
      expect(mockUseService).toHaveBeenCalledWith(undefined);
      expect(result.current.serviceSafeBalances).toBeDefined();
    });

    it('handles selectedAgentConfig being undefined (no evmHomeChainId)', () => {
      mockUseServices.mockReturnValue({
        selectedAgentConfig: undefined,
      });
      mockUseService.mockReturnValue({
        serviceSafes: DEFAULT_SERVICE_SAFES,
        serviceEoa: DEFAULT_SERVICE_EOA,
      });
      mockUseBalanceContext.mockReturnValue({
        walletBalances: allBalances,
        isLoading: false,
      });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      // serviceSafeBalances still filters by address match
      expect(result.current.serviceSafeBalances).toBeDefined();
      // Chain-filtered values return empty/null since evmHomeChainId is undefined
      expect(result.current.serviceSafeNativeBalances).toEqual([]);
      expect(result.current.serviceSafeErc20Balances).toEqual([]);
      expect(result.current.serviceSafeOlas).toBeUndefined();
      expect(result.current.serviceEoaNativeBalance).toBeUndefined();
      expect(result.current.serviceEoaErc20Balances).toEqual([]);
    });

    it('handles empty walletBalances array', () => {
      setupMocks({ walletBalances: [] });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceSafeBalances).toEqual([]);
      expect(result.current.serviceSafeOlas).toBeUndefined();
      expect(result.current.serviceSafeNativeBalances).toEqual([]);
      expect(result.current.serviceSafeErc20Balances).toEqual([]);
      expect(result.current.serviceEoaNativeBalance).toBeUndefined();
      expect(result.current.serviceEoaErc20Balances).toEqual([]);
    });

    it('works with a different home chain (Base)', () => {
      setupMocks({ evmHomeChainId: EvmChainIdMap.Base });
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      // Native home-chain balances are now Base, not Gnosis
      expect(result.current.serviceSafeNativeBalances).toHaveLength(1);
      expect(result.current.serviceSafeNativeBalances![0]).toBe(
        baseSafeNativeBalance,
      );
      // OLAS on Base
      expect(result.current.serviceSafeOlas).toBe(baseSafeOlasBalance);
      // Gnosis OLAS should not appear as serviceSafeOlas
      expect(result.current.serviceSafeOlas).not.toBe(gnosisSafeOlasBalance);
    });

    it('returns all cross-chain balances in serviceSafeBalances', () => {
      const { result } = renderHook(() =>
        useServiceBalances(DEFAULT_SERVICE_CONFIG_ID),
      );
      const chains = new Set(
        result.current.serviceSafeBalances!.map((b) => b.evmChainId),
      );
      expect(chains.has(EvmChainIdMap.Gnosis)).toBe(true);
      expect(chains.has(EvmChainIdMap.Base)).toBe(true);
    });

    it('passes serviceConfigId to useService', () => {
      renderHook(() => useServiceBalances(DEFAULT_SERVICE_CONFIG_ID));
      expect(mockUseService).toHaveBeenCalledWith(DEFAULT_SERVICE_CONFIG_ID);
    });
  });
});
