import { renderHook } from '@testing-library/react';

import {
  GNOSIS_TOKEN_CONFIG,
  TOKEN_CONFIG,
  TokenSymbolMap,
  TokenType,
} from '../../config/tokens';
import { EvmChainIdMap, MiddlewareChainMap } from '../../constants/chains';
import { useAvailableAgentAssets } from '../../hooks/useAvailableAgentAssets';
import { useServiceBalances } from '../../hooks/useServiceBalances';
import { useServices } from '../../hooks/useServices';
import { WalletBalance } from '../../types/Balance';
import {
  AGENT_KEY_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  DEFAULT_SERVICE_CONFIG_ID,
  makeService,
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
jest.mock('../../hooks/useServiceBalances', () => ({
  useServiceBalances: jest.fn(),
}));

const mockUseServices = useServices as jest.Mock;
const mockUseServiceBalances = useServiceBalances as jest.Mock;

// Sentinel to distinguish "not provided" from "explicitly undefined"
const NO_SERVICE = Symbol('NO_SERVICE');

// --- Balance fixtures ---

const safeNativeBalance: WalletBalance = {
  walletAddress: DEFAULT_SAFE_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap.XDAI,
  isNative: true,
  balance: 5.0,
  balanceString: '5.0',
};

const safeOlasBalance: WalletBalance = {
  walletAddress: DEFAULT_SAFE_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap.OLAS,
  isNative: false,
  balance: 100.0,
  balanceString: '100.0',
};

const safeUsdceBalance: WalletBalance = {
  walletAddress: DEFAULT_SAFE_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap['USDC.e'],
  isNative: false,
  balance: 50.0,
  balanceString: '50.0',
};

const eoaNativeBalance: WalletBalance = {
  walletAddress: AGENT_KEY_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap.XDAI,
  isNative: true,
  balance: 1.5,
  balanceString: '1.5',
};

const eoaUsdceBalance: WalletBalance = {
  walletAddress: AGENT_KEY_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap['USDC.e'],
  isNative: false,
  balance: 30.0,
  balanceString: '30.0',
};

const safePusdBalance: WalletBalance = {
  walletAddress: DEFAULT_SAFE_ADDRESS,
  evmChainId: EvmChainIdMap.Polygon,
  symbol: TokenSymbolMap.pUSD,
  isNative: false,
  balance: 50.0,
  balanceString: '50.0',
};

const eoaPusdBalance: WalletBalance = {
  walletAddress: AGENT_KEY_ADDRESS,
  evmChainId: EvmChainIdMap.Polygon,
  symbol: TokenSymbolMap.pUSD,
  isNative: false,
  balance: 30.0,
  balanceString: '30.0',
};

// --- Mock setup helper ---

type SetupMocksOptions = {
  evmHomeChainId?: number | null;
  middlewareHomeChainId?: string;
  erc20Tokens?: string[];
  selectedService?: ReturnType<typeof makeService> | typeof NO_SERVICE | null;
  serviceSafeOlas?: WalletBalance | null;
  serviceSafeNativeBalances?: WalletBalance[] | null;
  serviceSafeErc20Balances?: WalletBalance[] | null;
  serviceEoaNativeBalance?: WalletBalance | null;
  serviceEoaErc20Balances?: WalletBalance[] | null;
  isLoading?: boolean;
};

const setupMocks = (options: SetupMocksOptions = {}) => {
  const {
    evmHomeChainId = EvmChainIdMap.Gnosis,
    middlewareHomeChainId = MiddlewareChainMap.GNOSIS,
    erc20Tokens,
    selectedService = NO_SERVICE,
    serviceSafeOlas = safeOlasBalance,
    serviceSafeNativeBalances = [safeNativeBalance],
    serviceSafeErc20Balances = [safeUsdceBalance],
    serviceEoaNativeBalance = eoaNativeBalance,
    serviceEoaErc20Balances = [eoaUsdceBalance],
    isLoading = false,
  } = options;

  const resolvedService =
    selectedService === NO_SERVICE ? makeService() : selectedService;

  mockUseServices.mockReturnValue({
    selectedAgentConfig: {
      evmHomeChainId: evmHomeChainId === null ? undefined : evmHomeChainId,
      middlewareHomeChainId,
      erc20Tokens,
    },
    selectedService: resolvedService ?? undefined,
  });

  mockUseServiceBalances.mockReturnValue({
    serviceSafeOlas: serviceSafeOlas === null ? undefined : serviceSafeOlas,
    serviceSafeNativeBalances:
      serviceSafeNativeBalances === null
        ? undefined
        : serviceSafeNativeBalances,
    serviceSafeErc20Balances:
      serviceSafeErc20Balances === null ? undefined : serviceSafeErc20Balances,
    serviceEoaNativeBalance:
      serviceEoaNativeBalance === null ? undefined : serviceEoaNativeBalance,
    serviceEoaErc20Balances:
      serviceEoaErc20Balances === null ? undefined : serviceEoaErc20Balances,
    isLoading,
  });
};

describe('useAvailableAgentAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('when evmHomeChainId is falsy', () => {
    it('returns empty availableAssets when evmHomeChainId is undefined', () => {
      setupMocks({ evmHomeChainId: null });
      const { result } = renderHook(() => useAvailableAgentAssets());
      expect(result.current.availableAssets).toEqual([]);
    });

    it('returns empty availableAssets when evmHomeChainId is 0', () => {
      setupMocks({ evmHomeChainId: 0 });
      const { result } = renderHook(() => useAvailableAgentAssets());
      expect(result.current.availableAssets).toEqual([]);
    });
  });

  describe('token filtering', () => {
    it('always includes NativeGas tokens', () => {
      setupMocks({ erc20Tokens: undefined });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const symbols = result.current.availableAssets.map((a) => a.symbol);
      expect(symbols).toContain(TokenSymbolMap.XDAI);
    });

    it('always includes OLAS regardless of erc20Tokens', () => {
      setupMocks({ erc20Tokens: undefined });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const symbols = result.current.availableAssets.map((a) => a.symbol);
      expect(symbols).toContain(TokenSymbolMap.OLAS);
    });

    it('excludes other ERC20 tokens when not in erc20Tokens config', () => {
      setupMocks({ erc20Tokens: undefined });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const symbols = result.current.availableAssets.map((a) => a.symbol);
      // Gnosis config has WXDAI (wrapped) and USDC.e (erc20) beyond native+OLAS
      expect(symbols).not.toContain(TokenSymbolMap['USDC.e']);
      expect(symbols).not.toContain(TokenSymbolMap.WXDAI);
    });

    it('includes ERC20 token when listed in erc20Tokens', () => {
      setupMocks({ erc20Tokens: [TokenSymbolMap['USDC.e']] });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const symbols = result.current.availableAssets.map((a) => a.symbol);
      expect(symbols).toContain(TokenSymbolMap['USDC.e']);
    });

    it('includes wrapped token when listed in erc20Tokens', () => {
      setupMocks({ erc20Tokens: [TokenSymbolMap.WXDAI] });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const symbols = result.current.availableAssets.map((a) => a.symbol);
      expect(symbols).toContain(TokenSymbolMap.WXDAI);
    });

    it('includes multiple ERC20 tokens when all listed', () => {
      setupMocks({
        erc20Tokens: [TokenSymbolMap['USDC.e'], TokenSymbolMap.WXDAI],
      });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const symbols = result.current.availableAssets.map((a) => a.symbol);
      expect(symbols).toContain(TokenSymbolMap['USDC.e']);
      expect(symbols).toContain(TokenSymbolMap.WXDAI);
    });

    it('includes only NativeGas + OLAS when erc20Tokens is empty array', () => {
      setupMocks({ erc20Tokens: [] });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const symbols = result.current.availableAssets.map((a) => a.symbol);
      expect(symbols).toHaveLength(2);
      expect(symbols).toContain(TokenSymbolMap.XDAI);
      expect(symbols).toContain(TokenSymbolMap.OLAS);
    });
  });

  describe('asset address', () => {
    it('returns correct address for OLAS on Gnosis', () => {
      setupMocks();
      const { result } = renderHook(() => useAvailableAgentAssets());
      const olasAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.OLAS,
      );
      expect(olasAsset?.address).toBe(
        GNOSIS_TOKEN_CONFIG[TokenSymbolMap.OLAS]!.address,
      );
    });

    it('returns undefined address for native token', () => {
      setupMocks();
      const { result } = renderHook(() => useAvailableAgentAssets());
      const nativeAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.XDAI,
      );
      expect(nativeAsset?.address).toBeUndefined();
    });

    it('returns correct address for USDC.e on Gnosis', () => {
      setupMocks({ erc20Tokens: [TokenSymbolMap['USDC.e']] });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const usdceAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap['USDC.e'],
      );
      expect(usdceAsset?.address).toBe(
        GNOSIS_TOKEN_CONFIG[TokenSymbolMap['USDC.e']]!.address,
      );
    });
  });

  describe('OLAS balance', () => {
    it('returns OLAS balance from serviceSafeOlas.balance', () => {
      setupMocks();
      const { result } = renderHook(() => useAvailableAgentAssets());
      const olasAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.OLAS,
      );
      expect(olasAsset?.amount).toBe(safeOlasBalance.balance);
    });

    it('returns 0 when serviceSafeOlas is undefined', () => {
      setupMocks({ serviceSafeOlas: null });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const olasAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.OLAS,
      );
      // sum([undefined]) returns 0 per lodash behavior
      expect(olasAsset?.amount).toBe(0);
    });

    it('returns 0 when serviceSafeOlas balance is 0', () => {
      const zeroOlas: WalletBalance = {
        ...safeOlasBalance,
        balance: 0,
      };
      setupMocks({ serviceSafeOlas: zeroOlas });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const olasAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.OLAS,
      );
      expect(olasAsset?.amount).toBe(0);
    });
  });

  describe('native token balance', () => {
    it('sums serviceSafeNativeBalances and serviceEoaNativeBalance', () => {
      setupMocks();
      const { result } = renderHook(() => useAvailableAgentAssets());
      const nativeAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.XDAI,
      );
      const expectedBalance =
        safeNativeBalance.balance + eoaNativeBalance.balance;
      expect(nativeAsset?.amount).toBe(expectedBalance);
    });

    it('uses only safe balance when EOA native is undefined', () => {
      setupMocks({ serviceEoaNativeBalance: null });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const nativeAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.XDAI,
      );
      // sum([safeBalance, undefined]) returns safeBalance per lodash
      expect(nativeAsset?.amount).toBe(safeNativeBalance.balance);
    });

    it('uses only EOA balance when safe native balances list is empty', () => {
      setupMocks({ serviceSafeNativeBalances: [] });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const nativeAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.XDAI,
      );
      // find() returns undefined for empty array, sum([undefined, eoaBalance])
      expect(nativeAsset?.amount).toBe(eoaNativeBalance.balance);
    });

    it('returns 0 when both safe and EOA native balances are undefined', () => {
      setupMocks({
        serviceSafeNativeBalances: null,
        serviceEoaNativeBalance: null,
      });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const nativeAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.XDAI,
      );
      // sum([undefined, undefined]) returns 0 per lodash
      expect(nativeAsset?.amount).toBe(0);
    });

    it('handles multiple safe native balances by picking first match', () => {
      const secondSafeNative: WalletBalance = {
        ...safeNativeBalance,
        balance: 3.0,
      };
      setupMocks({
        serviceSafeNativeBalances: [safeNativeBalance, secondSafeNative],
      });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const nativeAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.XDAI,
      );
      // find() picks the first match
      const expected = safeNativeBalance.balance + eoaNativeBalance.balance;
      expect(nativeAsset?.amount).toBe(expected);
    });
  });

  describe('other ERC20 balance', () => {
    it('sums safe and EOA balances for the symbol', () => {
      setupMocks({ erc20Tokens: [TokenSymbolMap['USDC.e']] });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const usdceAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap['USDC.e'],
      );
      const expected = safeUsdceBalance.balance + eoaUsdceBalance.balance;
      expect(usdceAsset?.amount).toBe(expected);
    });

    it('returns only safe balance when no EOA ERC20 balance exists', () => {
      setupMocks({
        erc20Tokens: [TokenSymbolMap['USDC.e']],
        serviceEoaErc20Balances: [],
      });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const usdceAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap['USDC.e'],
      );
      expect(usdceAsset?.amount).toBe(safeUsdceBalance.balance);
    });

    it('returns only EOA balance when no safe ERC20 balance exists', () => {
      setupMocks({
        erc20Tokens: [TokenSymbolMap['USDC.e']],
        serviceSafeErc20Balances: [],
      });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const usdceAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap['USDC.e'],
      );
      expect(usdceAsset?.amount).toBe(eoaUsdceBalance.balance);
    });

    it('returns 0 when neither safe nor EOA have balance for the symbol', () => {
      setupMocks({
        erc20Tokens: [TokenSymbolMap['USDC.e']],
        serviceSafeErc20Balances: [],
        serviceEoaErc20Balances: [],
      });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const usdceAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap['USDC.e'],
      );
      expect(usdceAsset?.amount).toBe(0);
    });

    it('returns 0 when balances are undefined for the symbol', () => {
      setupMocks({
        erc20Tokens: [TokenSymbolMap['USDC.e']],
        serviceSafeErc20Balances: null,
        serviceEoaErc20Balances: null,
      });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const usdceAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap['USDC.e'],
      );
      expect(usdceAsset?.amount).toBe(0);
    });

    it('accumulates multiple safe balances with the same symbol', () => {
      const secondSafeUsdce: WalletBalance = {
        ...safeUsdceBalance,
        balance: 25.0,
      };
      setupMocks({
        erc20Tokens: [TokenSymbolMap['USDC.e']],
        serviceSafeErc20Balances: [safeUsdceBalance, secondSafeUsdce],
      });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const usdceAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap['USDC.e'],
      );
      const expected =
        safeUsdceBalance.balance +
        secondSafeUsdce.balance +
        eoaUsdceBalance.balance;
      expect(usdceAsset?.amount).toBe(expected);
    });
  });

  describe('isLoading pass-through', () => {
    it('returns true when useServiceBalances reports loading', () => {
      setupMocks({ isLoading: true });
      const { result } = renderHook(() => useAvailableAgentAssets());
      expect(result.current.isLoading).toBe(true);
    });

    it('returns false when useServiceBalances reports not loading', () => {
      setupMocks({ isLoading: false });
      const { result } = renderHook(() => useAvailableAgentAssets());
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('cross-chain support', () => {
    it.each([
      {
        chain: 'Base',
        evmHomeChainId: EvmChainIdMap.Base,
        middlewareHomeChainId: MiddlewareChainMap.BASE,
        nativeSymbol: TokenSymbolMap.ETH,
      },
      {
        chain: 'Mode',
        evmHomeChainId: EvmChainIdMap.Mode,
        middlewareHomeChainId: MiddlewareChainMap.MODE,
        nativeSymbol: TokenSymbolMap.ETH,
      },
      {
        chain: 'Optimism',
        evmHomeChainId: EvmChainIdMap.Optimism,
        middlewareHomeChainId: MiddlewareChainMap.OPTIMISM,
        nativeSymbol: TokenSymbolMap.ETH,
      },
      {
        chain: 'Polygon',
        evmHomeChainId: EvmChainIdMap.Polygon,
        middlewareHomeChainId: MiddlewareChainMap.POLYGON,
        nativeSymbol: TokenSymbolMap.POL,
      },
    ])(
      'includes NativeGas + OLAS for $chain',
      ({ evmHomeChainId, middlewareHomeChainId, nativeSymbol }) => {
        const nativeBal: WalletBalance = {
          walletAddress: DEFAULT_SAFE_ADDRESS,
          evmChainId: evmHomeChainId,
          symbol: nativeSymbol,
          isNative: true,
          balance: 2.0,
          balanceString: '2.0',
        };
        const eoaNativeBal: WalletBalance = {
          walletAddress: AGENT_KEY_ADDRESS,
          evmChainId: evmHomeChainId,
          symbol: nativeSymbol,
          isNative: true,
          balance: 0.5,
          balanceString: '0.5',
        };
        setupMocks({
          evmHomeChainId,
          middlewareHomeChainId,
          serviceSafeNativeBalances: [nativeBal],
          serviceEoaNativeBalance: eoaNativeBal,
          serviceSafeErc20Balances: [],
          serviceEoaErc20Balances: [],
          serviceSafeOlas: {
            walletAddress: DEFAULT_SAFE_ADDRESS,
            evmChainId: evmHomeChainId,
            symbol: TokenSymbolMap.OLAS,
            isNative: false,
            balance: 10.0,
            balanceString: '10.0',
          },
        });
        const { result } = renderHook(() => useAvailableAgentAssets());
        const symbols = result.current.availableAssets.map((a) => a.symbol);
        expect(symbols).toContain(nativeSymbol);
        expect(symbols).toContain(TokenSymbolMap.OLAS);
      },
    );

    it.each([
      {
        chain: 'Base',
        evmHomeChainId: EvmChainIdMap.Base,
        middlewareHomeChainId: MiddlewareChainMap.BASE,
        nativeSymbol: TokenSymbolMap.ETH,
      },
      {
        chain: 'Optimism',
        evmHomeChainId: EvmChainIdMap.Optimism,
        middlewareHomeChainId: MiddlewareChainMap.OPTIMISM,
        nativeSymbol: TokenSymbolMap.ETH,
      },
      {
        chain: 'Polygon',
        evmHomeChainId: EvmChainIdMap.Polygon,
        middlewareHomeChainId: MiddlewareChainMap.POLYGON,
        nativeSymbol: TokenSymbolMap.POL,
      },
    ])(
      'includes USDC on $chain when in erc20Tokens',
      ({ evmHomeChainId, middlewareHomeChainId, nativeSymbol }) => {
        setupMocks({
          evmHomeChainId,
          middlewareHomeChainId,
          erc20Tokens: [TokenSymbolMap.USDC],
          serviceSafeNativeBalances: [
            {
              walletAddress: DEFAULT_SAFE_ADDRESS,
              evmChainId: evmHomeChainId,
              symbol: nativeSymbol,
              isNative: true,
              balance: 1.0,
              balanceString: '1.0',
            },
          ],
          serviceEoaNativeBalance: {
            walletAddress: AGENT_KEY_ADDRESS,
            evmChainId: evmHomeChainId,
            symbol: nativeSymbol,
            isNative: true,
            balance: 0.1,
            balanceString: '0.1',
          },
          serviceSafeErc20Balances: [],
          serviceEoaErc20Balances: [],
          serviceSafeOlas: {
            walletAddress: DEFAULT_SAFE_ADDRESS,
            evmChainId: evmHomeChainId,
            symbol: TokenSymbolMap.OLAS,
            isNative: false,
            balance: 5.0,
            balanceString: '5.0',
          },
        });
        const { result } = renderHook(() => useAvailableAgentAssets());
        const symbols = result.current.availableAssets.map((a) => a.symbol);
        expect(symbols).toContain(TokenSymbolMap.USDC);

        const usdcAsset = result.current.availableAssets.find(
          (a) => a.symbol === TokenSymbolMap.USDC,
        );
        expect(usdcAsset?.address).toBe(
          TOKEN_CONFIG[evmHomeChainId][TokenSymbolMap.USDC]!.address,
        );
      },
    );
  });

  describe('hook calls', () => {
    it('calls useServices twice', () => {
      renderHook(() => useAvailableAgentAssets());
      // The hook calls useServices() for selectedAgentConfig and selectedService
      expect(mockUseServices).toHaveBeenCalledTimes(2);
    });

    it('passes service_config_id from selectedService to useServiceBalances', () => {
      const service = makeService({
        service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      });
      setupMocks({ selectedService: service });
      renderHook(() => useAvailableAgentAssets());
      expect(mockUseServiceBalances).toHaveBeenCalledWith(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    it('passes undefined to useServiceBalances when selectedService is undefined', () => {
      setupMocks({ selectedService: null });
      renderHook(() => useAvailableAgentAssets());
      expect(mockUseServiceBalances).toHaveBeenCalledWith(undefined);
    });
  });

  describe('asset shape', () => {
    it('each asset has address, symbol, and amount properties', () => {
      setupMocks({ erc20Tokens: [TokenSymbolMap['USDC.e']] });
      const { result } = renderHook(() => useAvailableAgentAssets());
      for (const asset of result.current.availableAssets) {
        expect(asset).toHaveProperty('symbol');
        expect(asset).toHaveProperty('amount');
        expect(asset).toHaveProperty('address');
      }
    });

    it('returns correct number of assets for Gnosis with no extra erc20Tokens', () => {
      setupMocks({ erc20Tokens: undefined });
      const { result } = renderHook(() => useAvailableAgentAssets());
      // Gnosis has XDAI (native) + OLAS (always included) = 2
      expect(result.current.availableAssets).toHaveLength(2);
    });

    it('returns correct number of assets for Gnosis with all erc20Tokens', () => {
      setupMocks({
        erc20Tokens: [TokenSymbolMap.WXDAI, TokenSymbolMap['USDC.e']],
      });
      const { result } = renderHook(() => useAvailableAgentAssets());
      // XDAI + OLAS + WXDAI + USDC.e = 4
      expect(result.current.availableAssets).toHaveLength(4);
    });
  });

  describe('Polygon / Polystrat (pUSD)', () => {
    beforeEach(() => {
      setupMocks({
        evmHomeChainId: EvmChainIdMap.Polygon,
        middlewareHomeChainId: MiddlewareChainMap.POLYGON,
        erc20Tokens: [TokenSymbolMap.USDC, TokenSymbolMap.pUSD],
        serviceSafeErc20Balances: [safePusdBalance],
        serviceEoaErc20Balances: [eoaPusdBalance],
      });
    });

    it('includes pUSD in availableAssets', () => {
      const { result } = renderHook(() => useAvailableAgentAssets());
      const symbols = result.current.availableAssets.map((a) => a.symbol);
      expect(symbols).toContain(TokenSymbolMap.pUSD);
    });

    it('does not include USDC.e in availableAssets (regression guard)', () => {
      const { result } = renderHook(() => useAvailableAgentAssets());
      const symbols = result.current.availableAssets.map((a) => a.symbol);
      expect(symbols).not.toContain(TokenSymbolMap['USDC.e']);
    });

    it('sums service safe and EOA ERC20 balances for pUSD', () => {
      const { result } = renderHook(() => useAvailableAgentAssets());
      const pusdAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.pUSD,
      );
      expect(pusdAsset?.amount).toBe(
        safePusdBalance.balance + eoaPusdBalance.balance,
      );
    });
  });

  describe('edge cases', () => {
    it('handles all balance sources being undefined', () => {
      setupMocks({
        serviceSafeOlas: null,
        serviceSafeNativeBalances: null,
        serviceSafeErc20Balances: null,
        serviceEoaNativeBalance: null,
        serviceEoaErc20Balances: null,
      });
      const { result } = renderHook(() => useAvailableAgentAssets());
      // Should still return assets with 0 amounts but not crash
      expect(result.current.availableAssets.length).toBeGreaterThanOrEqual(2);
      for (const asset of result.current.availableAssets) {
        expect(asset.amount).toBe(0);
      }
    });

    it('native asset has NativeGas token type in config', () => {
      setupMocks();
      const { result } = renderHook(() => useAvailableAgentAssets());
      const gnosisConfig = TOKEN_CONFIG[EvmChainIdMap.Gnosis];
      const nativeAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.XDAI,
      );
      expect(nativeAsset).toBeDefined();
      expect(gnosisConfig[nativeAsset!.symbol]!.tokenType).toBe(
        TokenType.NativeGas,
      );
    });

    it('OLAS asset has Erc20 token type in config', () => {
      setupMocks();
      const { result } = renderHook(() => useAvailableAgentAssets());
      const gnosisConfig = TOKEN_CONFIG[EvmChainIdMap.Gnosis];
      const olasAsset = result.current.availableAssets.find(
        (a) => a.symbol === TokenSymbolMap.OLAS,
      );
      expect(olasAsset).toBeDefined();
      expect(gnosisConfig[olasAsset!.symbol]!.tokenType).toBe(TokenType.Erc20);
    });

    it('all returned assets exist in chain token config', () => {
      setupMocks({
        erc20Tokens: [TokenSymbolMap['USDC.e'], TokenSymbolMap.WXDAI],
      });
      const { result } = renderHook(() => useAvailableAgentAssets());
      const gnosisConfig = TOKEN_CONFIG[EvmChainIdMap.Gnosis];
      const allSymbolsInConfig = result.current.availableAssets.every(
        (asset) => gnosisConfig[asset.symbol] !== undefined,
      );
      expect(allSymbolsInConfig).toBe(true);
    });
  });
});
