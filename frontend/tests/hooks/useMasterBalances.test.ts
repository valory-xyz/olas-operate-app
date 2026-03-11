import { renderHook } from '@testing-library/react';

import { TokenSymbolMap } from '../../config/tokens';
import { AddressZero } from '../../constants/address';
import { EvmChainIdMap } from '../../constants/chains';
import { MASTER_SAFE_REFILL_PLACEHOLDER } from '../../constants/defaults';
import { useBalanceAndRefillRequirementsContext } from '../../hooks/useBalanceAndRefillRequirementsContext';
import { useBalanceContext } from '../../hooks/useBalanceContext';
import { useMasterBalances } from '../../hooks/useMasterBalances';
import { useServices } from '../../hooks/useServices';
import { useMasterWalletContext } from '../../hooks/useWallet';
import { WalletBalance } from '../../types/Balance';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  makeMasterEoa,
  makeMasterSafe,
  POLYGON_SAFE_ADDRESS,
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

jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));

jest.mock('../../hooks/useBalanceContext', () => ({
  useBalanceContext: jest.fn(),
}));

jest.mock('../../hooks/useBalanceAndRefillRequirementsContext', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn(),
}));

const mockUseServices = useServices as jest.Mock;
const mockUseMasterWalletContext = useMasterWalletContext as jest.Mock;
const mockUseBalanceContext = useBalanceContext as jest.Mock;
const mockUseBalanceAndRefillRequirementsContext =
  useBalanceAndRefillRequirementsContext as jest.Mock;

const makeWalletBalance = (
  overrides: Partial<WalletBalance> & Pick<WalletBalance, 'walletAddress'>,
): WalletBalance => ({
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap.XDAI,
  isNative: true,
  balance: 1.5,
  balanceString: '1500000000000000000',
  ...overrides,
});

describe('useMasterBalances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({
      selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Gnosis },
    });
    mockUseMasterWalletContext.mockReturnValue({
      masterEoa: makeMasterEoa(),
      masterSafes: [makeMasterSafe(EvmChainIdMap.Gnosis)],
    });
    mockUseBalanceContext.mockReturnValue({
      isLoaded: true,
      walletBalances: [],
    });
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
      refillRequirements: {},
    });
  });

  describe('isLoaded', () => {
    it('returns isLoaded from balance context', () => {
      mockUseBalanceContext.mockReturnValue({
        isLoaded: false,
        walletBalances: [],
      });
      const { result } = renderHook(() => useMasterBalances());
      expect(result.current.isLoaded).toBe(false);
    });
  });

  describe('getMasterSafeNativeBalanceOf', () => {
    it('returns native balances for the safe on the given chain', () => {
      mockUseBalanceContext.mockReturnValue({
        isLoaded: true,
        walletBalances: [
          makeWalletBalance({
            walletAddress: DEFAULT_SAFE_ADDRESS,
            isNative: true,
            balanceString: '2000000000000000000',
          }),
        ],
      });

      const { result } = renderHook(() => useMasterBalances());
      const nativeBalances = result.current.getMasterSafeNativeBalanceOf(
        EvmChainIdMap.Gnosis,
      );

      expect(nativeBalances).toHaveLength(1);
      expect(nativeBalances![0].balanceString).toBe('2000000000000000000');
    });

    it('excludes wrapped tokens from native balances', () => {
      mockUseBalanceContext.mockReturnValue({
        isLoaded: true,
        walletBalances: [
          makeWalletBalance({
            walletAddress: DEFAULT_SAFE_ADDRESS,
            isNative: true,
            isWrappedToken: true,
            symbol: TokenSymbolMap.WXDAI,
          }),
        ],
      });

      const { result } = renderHook(() => useMasterBalances());
      const nativeBalances = result.current.getMasterSafeNativeBalanceOf(
        EvmChainIdMap.Gnosis,
      );
      expect(nativeBalances).toHaveLength(0);
    });

    it('returns undefined when no safe exists for the chain', () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterEoa: makeMasterEoa(),
        masterSafes: [makeMasterSafe(EvmChainIdMap.Base)],
      });

      const { result } = renderHook(() => useMasterBalances());
      const nativeBalances = result.current.getMasterSafeNativeBalanceOf(
        EvmChainIdMap.Gnosis,
      );
      expect(nativeBalances).toBeUndefined();
    });
  });

  describe('getMasterSafeOlasBalanceOfInStr', () => {
    it('returns summed OLAS balance as string', () => {
      mockUseBalanceContext.mockReturnValue({
        isLoaded: true,
        walletBalances: [
          makeWalletBalance({
            walletAddress: DEFAULT_SAFE_ADDRESS,
            symbol: TokenSymbolMap.OLAS,
            isNative: false,
            balanceString: '5000000000000000000',
          }),
        ],
      });

      const { result } = renderHook(() => useMasterBalances());
      const olasBalance = result.current.getMasterSafeOlasBalanceOfInStr(
        EvmChainIdMap.Gnosis,
      );
      expect(olasBalance).toBe('5000000000000000000.0');
    });

    it('returns undefined when no safe exists for chain', () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterEoa: makeMasterEoa(),
        masterSafes: [],
      });

      const { result } = renderHook(() => useMasterBalances());
      const olasBalance = result.current.getMasterSafeOlasBalanceOfInStr(
        EvmChainIdMap.Gnosis,
      );
      expect(olasBalance).toBeUndefined();
    });
  });

  describe('getMasterSafeErc20BalancesInStr', () => {
    it('returns ERC20 balances excluding native and OLAS', () => {
      mockUseBalanceContext.mockReturnValue({
        isLoaded: true,
        walletBalances: [
          makeWalletBalance({
            walletAddress: DEFAULT_SAFE_ADDRESS,
            symbol: TokenSymbolMap.XDAI,
            isNative: true,
          }),
          makeWalletBalance({
            walletAddress: DEFAULT_SAFE_ADDRESS,
            symbol: TokenSymbolMap.OLAS,
            isNative: false,
            balanceString: '1000000000000000000',
          }),
          makeWalletBalance({
            walletAddress: DEFAULT_SAFE_ADDRESS,
            symbol: TokenSymbolMap.WXDAI,
            isNative: false,
            balanceString: '3000000000000000000',
          }),
        ],
      });

      const { result } = renderHook(() => useMasterBalances());
      const erc20Balances = result.current.getMasterSafeErc20BalancesInStr(
        EvmChainIdMap.Gnosis,
      );
      expect(erc20Balances).toEqual({ WXDAI: '3000000000000000000.0' });
    });

    it('returns undefined when no safe exists for chain', () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterEoa: makeMasterEoa(),
        masterSafes: [],
      });

      const { result } = renderHook(() => useMasterBalances());
      const erc20Balances = result.current.getMasterSafeErc20BalancesInStr(
        EvmChainIdMap.Gnosis,
      );
      expect(erc20Balances).toBeUndefined();
    });
  });

  describe('getMasterSafeBalancesOf', () => {
    it('returns all balances for the safe on the given chain', () => {
      const safeBalance = makeWalletBalance({
        walletAddress: DEFAULT_SAFE_ADDRESS,
      });
      const eoaBalance = makeWalletBalance({
        walletAddress: DEFAULT_EOA_ADDRESS,
      });
      mockUseBalanceContext.mockReturnValue({
        isLoaded: true,
        walletBalances: [safeBalance, eoaBalance],
      });

      const { result } = renderHook(() => useMasterBalances());
      const balances = result.current.getMasterSafeBalancesOf(
        EvmChainIdMap.Gnosis,
      );

      expect(balances).toHaveLength(1);
      expect(balances[0].walletAddress).toBe(DEFAULT_SAFE_ADDRESS);
    });
  });

  describe('master EOA balances', () => {
    it('getMasterEoaNativeBalanceOf returns summed native balance as string', () => {
      mockUseBalanceContext.mockReturnValue({
        isLoaded: true,
        walletBalances: [
          makeWalletBalance({
            walletAddress: DEFAULT_EOA_ADDRESS,
            isNative: true,
            balanceString: '1000000000000000000',
          }),
        ],
      });

      const { result } = renderHook(() => useMasterBalances());
      const nativeBalance = result.current.getMasterEoaNativeBalanceOf(
        EvmChainIdMap.Gnosis,
      );

      expect(nativeBalance).toBe('1000000000000000000.0');
    });

    it('getMasterEoaNativeBalanceOf returns undefined when no masterEoa', () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterEoa: undefined,
        masterSafes: [makeMasterSafe(EvmChainIdMap.Gnosis)],
      });

      const { result } = renderHook(() => useMasterBalances());
      const nativeBalance = result.current.getMasterEoaNativeBalanceOf(
        EvmChainIdMap.Gnosis,
      );
      expect(nativeBalance).toBeUndefined();
    });

    it('getMasterEoaBalancesOf returns all EOA balances for chain', () => {
      mockUseBalanceContext.mockReturnValue({
        isLoaded: true,
        walletBalances: [
          makeWalletBalance({
            walletAddress: DEFAULT_EOA_ADDRESS,
            evmChainId: EvmChainIdMap.Gnosis,
          }),
          makeWalletBalance({
            walletAddress: DEFAULT_EOA_ADDRESS,
            evmChainId: EvmChainIdMap.Base,
          }),
        ],
      });

      const { result } = renderHook(() => useMasterBalances());
      const balances = result.current.getMasterEoaBalancesOf(
        EvmChainIdMap.Gnosis,
      );

      expect(balances).toHaveLength(1);
      expect(balances[0].evmChainId).toBe(EvmChainIdMap.Gnosis);
    });
  });

  describe('isMasterEoaLowOnGas', () => {
    it('returns true when gas refill requirement is > 0', () => {
      mockUseBalanceContext.mockReturnValue({
        isLoaded: true,
        walletBalances: [
          makeWalletBalance({
            walletAddress: DEFAULT_EOA_ADDRESS,
            isNative: true,
          }),
        ],
      });
      mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
        refillRequirements: {
          [DEFAULT_EOA_ADDRESS]: {
            [AddressZero]: '100000000000000000',
          },
        },
      });

      const { result } = renderHook(() => useMasterBalances());
      expect(result.current.isMasterEoaLowOnGas).toBe(true);
    });

    it('returns false when gas refill requirement is 0', () => {
      mockUseBalanceContext.mockReturnValue({
        isLoaded: true,
        walletBalances: [
          makeWalletBalance({
            walletAddress: DEFAULT_EOA_ADDRESS,
            isNative: true,
          }),
        ],
      });
      mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
        refillRequirements: {
          [DEFAULT_EOA_ADDRESS]: {
            [AddressZero]: '0',
          },
        },
      });

      const { result } = renderHook(() => useMasterBalances());
      expect(result.current.isMasterEoaLowOnGas).toBe(false);
    });

    it('returns false when refillRequirements has MASTER_SAFE_REFILL_PLACEHOLDER', () => {
      mockUseBalanceContext.mockReturnValue({
        isLoaded: true,
        walletBalances: [
          makeWalletBalance({
            walletAddress: DEFAULT_EOA_ADDRESS,
            isNative: true,
          }),
        ],
      });
      mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
        refillRequirements: {
          [MASTER_SAFE_REFILL_PLACEHOLDER]: {},
          [DEFAULT_EOA_ADDRESS]: {
            [AddressZero]: '100000000000000000',
          },
        },
      });

      const { result } = renderHook(() => useMasterBalances());
      expect(result.current.isMasterEoaLowOnGas).toBe(false);
    });

    it('returns false when refillRequirements is undefined', () => {
      mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
        refillRequirements: undefined,
      });

      const { result } = renderHook(() => useMasterBalances());
      expect(result.current.isMasterEoaLowOnGas).toBe(false);
    });
  });

  describe('masterEoaGasRequirement', () => {
    it('returns formatted gas requirement', () => {
      mockUseBalanceContext.mockReturnValue({
        isLoaded: true,
        walletBalances: [
          makeWalletBalance({
            walletAddress: DEFAULT_EOA_ADDRESS,
            isNative: true,
          }),
        ],
      });
      mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
        refillRequirements: {
          [DEFAULT_EOA_ADDRESS]: {
            [AddressZero]: '1000000000000000000', // 1 ETH/XDAI
          },
        },
      });

      const { result } = renderHook(() => useMasterBalances());
      expect(result.current.masterEoaGasRequirement).toBe(1);
    });

    it('returns undefined when no requirement exists', () => {
      mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
        refillRequirements: {},
      });

      const { result } = renderHook(() => useMasterBalances());
      expect(result.current.masterEoaGasRequirement).toBeUndefined();
    });
  });

  describe('cross-chain filtering', () => {
    it('only returns balances for the correct chain', () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterEoa: makeMasterEoa(),
        masterSafes: [
          makeMasterSafe(EvmChainIdMap.Gnosis),
          makeMasterSafe(EvmChainIdMap.Polygon, POLYGON_SAFE_ADDRESS),
        ],
      });
      mockUseBalanceContext.mockReturnValue({
        isLoaded: true,
        walletBalances: [
          makeWalletBalance({
            walletAddress: DEFAULT_SAFE_ADDRESS,
            evmChainId: EvmChainIdMap.Gnosis,
            balanceString: '1000000000000000000',
          }),
          makeWalletBalance({
            walletAddress: POLYGON_SAFE_ADDRESS,
            evmChainId: EvmChainIdMap.Polygon,
            symbol: TokenSymbolMap.POL,
            balanceString: '2000000000000000000',
          }),
        ],
      });

      const { result } = renderHook(() => useMasterBalances());

      const gnosisBalances = result.current.getMasterSafeBalancesOf(
        EvmChainIdMap.Gnosis,
      );
      const polygonBalances = result.current.getMasterSafeBalancesOf(
        EvmChainIdMap.Polygon,
      );

      expect(gnosisBalances).toHaveLength(1);
      expect(polygonBalances).toHaveLength(1);
      expect(gnosisBalances[0].walletAddress).toBe(DEFAULT_SAFE_ADDRESS);
      expect(polygonBalances[0].walletAddress).toBe(POLYGON_SAFE_ADDRESS);
    });
  });
});
