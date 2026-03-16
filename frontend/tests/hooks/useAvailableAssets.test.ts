import { renderHook } from '@testing-library/react';

import {
  GNOSIS_TOKEN_CONFIG,
  OPTIMISM_TOKEN_CONFIG,
  POLYGON_TOKEN_CONFIG,
  TOKEN_CONFIG,
  TokenSymbolMap,
} from '../../config/tokens';
import { EvmChainId, EvmChainIdMap } from '../../constants/chains';
import { useAvailableAssets } from '../../hooks/useAvailableAssets';
import { useMasterBalances } from '../../hooks/useMasterBalances';
import { useStakingRewardsOf } from '../../hooks/useStakingRewardsOf';
import { ALL_EVM_CHAIN_IDS } from '../helpers/factories';

jest.mock('../../hooks/useMasterBalances', () => ({
  useMasterBalances: jest.fn(),
}));

jest.mock('../../hooks/useStakingRewardsOf', () => ({
  useStakingRewardsOf: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
// Mock the barrel to avoid loading all hooks (which triggers provider imports).
// Re-export from the already-mocked direct module so both paths share the same mock fn.
jest.mock('../../hooks', () => ({
  useMasterBalances: require('../../hooks/useMasterBalances').useMasterBalances,
}));

// Mock the utils barrel to avoid deep import chain (backoff -> constants -> providers).
// Re-export from the safe direct modules.
jest.mock('../../utils', () => ({
  ...require('../../utils/calculations'),
  ...require('../../utils/middlewareHelpers'),
}));
/* eslint-enable @typescript-eslint/no-var-requires */

const mockUseMasterBalances = useMasterBalances as jest.Mock;
const mockUseStakingRewardsOf = useStakingRewardsOf as jest.Mock;

const defaultMasterBalances = {
  isLoaded: true,
  getMasterSafeNativeBalanceOf: jest.fn().mockReturnValue([]),
  getMasterSafeErc20BalancesInStr: jest.fn().mockReturnValue(undefined),
  getMasterEoaNativeBalanceOf: jest.fn().mockReturnValue('0'),
  getMasterSafeOlasBalanceOfInStr: jest.fn().mockReturnValue(undefined),
};

const defaultStakingRewards = {
  totalStakingRewards: '0',
  isLoading: false,
};

describe('useAvailableAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMasterBalances.mockReturnValue({ ...defaultMasterBalances });
    mockUseStakingRewardsOf.mockReturnValue({ ...defaultStakingRewards });
  });

  describe('returns empty array when walletChainId is falsy', () => {
    it.each([0, undefined, null])('walletChainId = %s', (falsy) => {
      const { result } = renderHook(() =>
        useAvailableAssets(falsy as unknown as EvmChainId),
      );
      expect(result.current.availableAssets).toEqual([]);
    });
  });

  describe('returns all tokens from TOKEN_CONFIG for the given chain', () => {
    it.each(ALL_EVM_CHAIN_IDS)(
      'chain %i has correct number of tokens',
      (chainId) => {
        const { result } = renderHook(() => useAvailableAssets(chainId));
        const expectedCount = Object.keys(TOKEN_CONFIG[chainId]).length;
        expect(result.current.availableAssets).toHaveLength(expectedCount);
      },
    );

    it('returns correct symbols and addresses for Gnosis', () => {
      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      const assets = result.current.availableAssets;
      const symbols = assets.map((a) => a.symbol);

      expect(symbols).toContain(TokenSymbolMap.XDAI);
      expect(symbols).toContain(TokenSymbolMap.OLAS);
      expect(symbols).toContain(TokenSymbolMap.WXDAI);
      expect(symbols).toContain(TokenSymbolMap['USDC.e']);

      const olasAsset = assets.find((a) => a.symbol === TokenSymbolMap.OLAS);
      expect(olasAsset?.address).toBe(GNOSIS_TOKEN_CONFIG.OLAS!.address);

      // Native token has no address
      const nativeAsset = assets.find((a) => a.symbol === TokenSymbolMap.XDAI);
      expect(nativeAsset?.address).toBeUndefined();
    });

    it('returns correct symbols and addresses for Polygon', () => {
      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Polygon),
      );
      const assets = result.current.availableAssets;
      const symbols = assets.map((a) => a.symbol);

      expect(symbols).toContain(TokenSymbolMap.POL);
      expect(symbols).toContain(TokenSymbolMap.OLAS);
      expect(symbols).toContain(TokenSymbolMap.USDC);
      expect(symbols).toContain(TokenSymbolMap['USDC.e']);

      const olasAsset = assets.find((a) => a.symbol === TokenSymbolMap.OLAS);
      expect(olasAsset?.address).toBe(POLYGON_TOKEN_CONFIG.OLAS!.address);
    });

    it('returns correct symbols and addresses for Optimism', () => {
      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Optimism),
      );
      const assets = result.current.availableAssets;
      const symbols = assets.map((a) => a.symbol);

      expect(symbols).toContain(TokenSymbolMap.ETH);
      expect(symbols).toContain(TokenSymbolMap.OLAS);
      expect(symbols).toContain(TokenSymbolMap.USDC);

      const usdcAsset = assets.find((a) => a.symbol === TokenSymbolMap.USDC);
      expect(usdcAsset?.address).toBe(OPTIMISM_TOKEN_CONFIG.USDC!.address);
    });
  });

  describe('OLAS token balance', () => {
    it('sums safe OLAS balance and staking rewards', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeOlasBalanceOfInStr: jest.fn().mockReturnValue('3.0'),
      });
      mockUseStakingRewardsOf.mockReturnValue({
        totalStakingRewards: '2.0',
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      const olasAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.OLAS,
      );

      // sumBigNumbers(['3.0', '2.0']) = '5.0'
      expect(olasAsset?.amountInStr).toBe('5.0');
      expect(olasAsset?.amount).toBe(5);
    });

    it('uses only staking rewards when safe OLAS balance is undefined', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeOlasBalanceOfInStr: jest.fn().mockReturnValue(undefined),
      });
      mockUseStakingRewardsOf.mockReturnValue({
        totalStakingRewards: '1.0',
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      const olasAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.OLAS,
      );

      // compact removes undefined, so sumBigNumbers(['1.0'])
      expect(olasAsset?.amountInStr).toBe('1.0');
      expect(olasAsset?.amount).toBe(1);
    });

    it('uses only safe balance when staking rewards is falsy', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeOlasBalanceOfInStr: jest.fn().mockReturnValue('4.0'),
      });
      mockUseStakingRewardsOf.mockReturnValue({
        totalStakingRewards: '0',
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      const olasAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.OLAS,
      );

      // sumBigNumbers(['4.0', '0']) = '4.0'
      expect(olasAsset?.amountInStr).toBe('4.0');
      expect(olasAsset?.amount).toBe(4);
    });
  });

  describe('native token balance', () => {
    it('sums safe native balances and EOA native balance (Gnosis)', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeNativeBalanceOf: jest
          .fn()
          .mockReturnValue([
            { balanceString: '1.0' },
            { balanceString: '0.5' },
          ]),
        getMasterEoaNativeBalanceOf: jest.fn().mockReturnValue('2.0'),
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      const nativeAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.XDAI,
      );

      // 1.0 + 0.5 + 2.0 = 3.5
      expect(nativeAsset?.amountInStr).toBe('3.5');
      expect(nativeAsset?.amount).toBe(3.5);
    });

    it('sums safe native balances and EOA native balance (Base - ETH)', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeNativeBalanceOf: jest
          .fn()
          .mockReturnValue([{ balanceString: '3.0' }]),
        getMasterEoaNativeBalanceOf: jest.fn().mockReturnValue('1.0'),
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Base),
      );
      const nativeAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.ETH,
      );

      // 3.0 + 1.0 = 4.0
      expect(nativeAsset?.amountInStr).toBe('4.0');
      expect(nativeAsset?.amount).toBe(4);
    });

    it('sums safe native balances and EOA native balance (Polygon - POL)', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeNativeBalanceOf: jest
          .fn()
          .mockReturnValue([{ balanceString: '5.0' }]),
        getMasterEoaNativeBalanceOf: jest.fn().mockReturnValue('1.0'),
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Polygon),
      );
      const nativeAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.POL,
      );

      // 5.0 + 1.0 = 6.0
      expect(nativeAsset?.amountInStr).toBe('6.0');
      expect(nativeAsset?.amount).toBe(6);
    });

    it('returns "0" when safe native balance is undefined and EOA is "0"', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeNativeBalanceOf: jest.fn().mockReturnValue(undefined),
        getMasterEoaNativeBalanceOf: jest.fn().mockReturnValue('0'),
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      const nativeAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.XDAI,
      );

      // compact(['0']) => ['0'], sumBigNumbers(['0']) = '0.0'
      expect(nativeAsset?.amountInStr).toBe('0.0');
      expect(nativeAsset?.amount).toBe(0);
    });
  });

  describe('native token with includeMasterEoa=false', () => {
    it('excludes EOA balance when includeMasterEoa is false', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeNativeBalanceOf: jest
          .fn()
          .mockReturnValue([{ balanceString: '1.0' }]),
        getMasterEoaNativeBalanceOf: jest.fn().mockReturnValue('5.0'),
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis, { includeMasterEoa: false }),
      );
      const nativeAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.XDAI,
      );

      // With includeMasterEoa=false, EOA balance is replaced with '0'
      // sumBigNumbers(['1.0', '0']) = '1.0'
      expect(nativeAsset?.amountInStr).toBe('1.0');
      expect(nativeAsset?.amount).toBe(1);
    });

    it('includes EOA balance by default (includeMasterEoa defaults to true)', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeNativeBalanceOf: jest
          .fn()
          .mockReturnValue([{ balanceString: '1.0' }]),
        getMasterEoaNativeBalanceOf: jest.fn().mockReturnValue('5.0'),
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      const nativeAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.XDAI,
      );

      // 1.0 + 5.0 = 6.0
      expect(nativeAsset?.amountInStr).toBe('6.0');
      expect(nativeAsset?.amount).toBe(6);
    });
  });

  describe('other ERC20 tokens', () => {
    it('returns ERC20 balance from safe balances (WXDAI on Gnosis)', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeErc20BalancesInStr: jest.fn().mockReturnValue({
          [TokenSymbolMap.WXDAI]: '42.5',
        }),
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      const wxdaiAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.WXDAI,
      );

      expect(wxdaiAsset?.amountInStr).toBe('42.5');
      expect(wxdaiAsset?.amount).toBe(42.5);
      expect(wxdaiAsset?.address).toBe(GNOSIS_TOKEN_CONFIG.WXDAI!.address);
    });

    it('returns "0" when ERC20 balance is not present', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeErc20BalancesInStr: jest.fn().mockReturnValue({}),
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      const wxdaiAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.WXDAI,
      );

      expect(wxdaiAsset?.amountInStr).toBe('0');
      expect(wxdaiAsset?.amount).toBe(0);
    });

    it('returns "0" when getMasterSafeErc20BalancesInStr returns undefined', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeErc20BalancesInStr: jest.fn().mockReturnValue(undefined),
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      const wxdaiAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.WXDAI,
      );

      expect(wxdaiAsset?.amountInStr).toBe('0');
      expect(wxdaiAsset?.amount).toBe(0);
    });

    it('returns USDC balance on Optimism', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeErc20BalancesInStr: jest.fn().mockReturnValue({
          [TokenSymbolMap.USDC]: '5000000.0',
        }),
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Optimism),
      );
      const usdcAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.USDC,
      );

      expect(usdcAsset?.amountInStr).toBe('5000000.0');
      expect(usdcAsset?.address).toBe(OPTIMISM_TOKEN_CONFIG.USDC!.address);
    });
  });

  describe('isLoading', () => {
    it('returns true when staking rewards are loading', () => {
      mockUseStakingRewardsOf.mockReturnValue({
        totalStakingRewards: '0',
        isLoading: true,
      });
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        isLoaded: true,
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      expect(result.current.isLoading).toBe(true);
    });

    it('returns true when balance is not loaded', () => {
      mockUseStakingRewardsOf.mockReturnValue({
        totalStakingRewards: '0',
        isLoading: false,
      });
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        isLoaded: false,
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      expect(result.current.isLoading).toBe(true);
    });

    it('returns true when both staking rewards loading and balance not loaded', () => {
      mockUseStakingRewardsOf.mockReturnValue({
        totalStakingRewards: '0',
        isLoading: true,
      });
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        isLoaded: false,
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      expect(result.current.isLoading).toBe(true);
    });

    it('returns false when staking rewards loaded and balance loaded', () => {
      mockUseStakingRewardsOf.mockReturnValue({
        totalStakingRewards: '0',
        isLoading: false,
      });
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        isLoaded: true,
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('asset shape', () => {
    it('each asset has address, symbol, amount, and amountInStr', () => {
      mockUseMasterBalances.mockReturnValue({
        ...defaultMasterBalances,
        getMasterSafeOlasBalanceOfInStr: jest.fn().mockReturnValue('1.0'),
        getMasterSafeNativeBalanceOf: jest
          .fn()
          .mockReturnValue([{ balanceString: '2.0' }]),
        getMasterEoaNativeBalanceOf: jest.fn().mockReturnValue('0'),
        getMasterSafeErc20BalancesInStr: jest.fn().mockReturnValue({
          [TokenSymbolMap.WXDAI]: '3.0',
          [TokenSymbolMap['USDC.e']]: '500000.0',
        }),
      });

      const { result } = renderHook(() =>
        useAvailableAssets(EvmChainIdMap.Gnosis),
      );
      const assets = result.current.availableAssets;

      for (const asset of assets) {
        expect(asset).toHaveProperty('symbol');
        expect(asset).toHaveProperty('amount');
        expect(asset).toHaveProperty('amountInStr');
        expect(typeof asset.symbol).toBe('string');
        expect(typeof asset.amount).toBe('number');
      }

      // Check specific asset shapes
      const olasAsset = assets.find((a) => a.symbol === TokenSymbolMap.OLAS);
      expect(olasAsset).toEqual({
        address: GNOSIS_TOKEN_CONFIG.OLAS!.address,
        symbol: TokenSymbolMap.OLAS,
        amount: expect.any(Number),
        amountInStr: expect.any(String),
      });

      const nativeAsset = assets.find((a) => a.symbol === TokenSymbolMap.XDAI);
      expect(nativeAsset).toEqual({
        address: undefined,
        symbol: TokenSymbolMap.XDAI,
        amount: expect.any(Number),
        amountInStr: expect.any(String),
      });
    });
  });

  describe('all chains produce valid assets', () => {
    it.each(ALL_EVM_CHAIN_IDS)(
      'chain %i produces assets with valid structure',
      (chainId) => {
        const { result } = renderHook(() => useAvailableAssets(chainId));
        const assets = result.current.availableAssets;

        expect(assets.length).toBeGreaterThan(0);
        for (const asset of assets) {
          expect(typeof asset.symbol).toBe('string');
          expect(typeof asset.amount).toBe('number');
          expect(asset.amountInStr).toBeDefined();
        }

        // Every chain has OLAS
        const olasAsset = assets.find((a) => a.symbol === TokenSymbolMap.OLAS);
        expect(olasAsset).toBeDefined();
        expect(olasAsset?.address).toBe(TOKEN_CONFIG[chainId].OLAS!.address);
      },
    );
  });
});
