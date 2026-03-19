import { renderHook } from '@testing-library/react';
import { act } from 'react';

import {
  GNOSIS_TOKEN_CONFIG,
  TokenSymbolConfigMap,
  TokenSymbolMap,
} from '../../config/tokens';
import { AddressZero } from '../../constants/address';
import { EvmChainIdMap } from '../../constants/chains';
import { MASTER_SAFE_REFILL_PLACEHOLDER } from '../../constants/defaults';
import { useBalanceAndRefillRequirementsContext } from '../../hooks/useBalanceAndRefillRequirementsContext';
import { useGetRefillRequirements } from '../../hooks/useGetRefillRequirements';
import { useServices } from '../../hooks/useServices';
import { useMasterWalletContext } from '../../hooks/useWallet';
import { Address } from '../../types/Address';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  makeMasterEoa,
  makeMasterSafe,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../helpers/factories';

const OLAS_ADDRESS = GNOSIS_TOKEN_CONFIG[TokenSymbolMap.OLAS]!
  .address as Address;

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({ providers: [] }));

jest.mock('../../hooks/useBalanceAndRefillRequirementsContext', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn(),
}));
jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));
jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));

const mockUseBalanceContext =
  useBalanceAndRefillRequirementsContext as jest.MockedFunction<
    typeof useBalanceAndRefillRequirementsContext
  >;
const mockUseMasterWalletContext =
  useMasterWalletContext as jest.MockedFunction<typeof useMasterWalletContext>;
const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;

const GNOSIS_CHAIN_ID = EvmChainIdMap.Gnosis;

const defaultMasterEoa = makeMasterEoa(DEFAULT_EOA_ADDRESS);
const defaultMasterSafe = makeMasterSafe(GNOSIS_CHAIN_ID, DEFAULT_SAFE_ADDRESS);

const defaultSelectedAgentConfig = {
  evmHomeChainId: GNOSIS_CHAIN_ID,
} as ReturnType<typeof useServices>['selectedAgentConfig'];

const mockResetQueryCache = jest.fn();

type SetupMocksOptions = {
  isLoading?: boolean;
  totalRequirements?: ReturnType<
    typeof useBalanceAndRefillRequirementsContext
  >['totalRequirements'];
  refillRequirements?: ReturnType<
    typeof useBalanceAndRefillRequirementsContext
  >['refillRequirements'];
  masterEoa?: ReturnType<typeof useMasterWalletContext>['masterEoa'];
  isFetched?: boolean;
  getMasterSafeOf?: ReturnType<
    typeof useMasterWalletContext
  >['getMasterSafeOf'];
  selectedAgentConfig?: ReturnType<typeof useServices>['selectedAgentConfig'];
  selectedAgentType?: ReturnType<typeof useServices>['selectedAgentType'];
};

function setupMocks(options: SetupMocksOptions = {}) {
  const {
    isLoading = false,
    totalRequirements = undefined,
    refillRequirements = undefined,
    masterEoa = defaultMasterEoa,
    isFetched = true,
    getMasterSafeOf = () => defaultMasterSafe,
    selectedAgentConfig = defaultSelectedAgentConfig,
    selectedAgentType = 'trader',
  } = options;

  mockUseBalanceContext.mockReturnValue({
    totalRequirements,
    refillRequirements,
    resetQueryCache: mockResetQueryCache,
    isBalancesAndFundingRequirementsLoading: isLoading,
  } as unknown as ReturnType<typeof useBalanceAndRefillRequirementsContext>);

  mockUseMasterWalletContext.mockReturnValue({
    masterEoa,
    getMasterSafeOf,
    isFetched,
  } as unknown as ReturnType<typeof useMasterWalletContext>);

  mockUseServices.mockReturnValue({
    selectedAgentConfig,
    selectedAgentType,
  } as ReturnType<typeof useServices>);
}

/** Builds a totalRequirements record. */
function buildRequirements({
  safeAddress,
  nativeSafe,
  nativeEoa,
  erc20Safe,
}: {
  safeAddress: string;
  nativeSafe: string;
  nativeEoa?: string;
  erc20Safe?: string;
}) {
  const record: Record<string, Record<string, string>> = {
    [safeAddress]: {
      [AddressZero]: nativeSafe,
    },
  };

  if (erc20Safe !== undefined) {
    record[safeAddress][OLAS_ADDRESS] = erc20Safe;
  }

  if (nativeEoa !== undefined) {
    record[DEFAULT_EOA_ADDRESS] = {
      ...record[DEFAULT_EOA_ADDRESS],
      [AddressZero]: nativeEoa,
    };
  }

  return record;
}

/**
 * Canonical valid requirements that always produce a non-empty result.
 * Used as a baseline for all tests that need the hook to complete initial render
 * without triggering the source hook's known isEmpty([]) loop.
 */
const VALID_REQUIREMENTS = buildRequirements({
  safeAddress: DEFAULT_SAFE_ADDRESS,
  nativeSafe: '1000000000000000000', // 1 XDAI
});

describe('useGetRefillRequirements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('native token (AddressZero) requirements', () => {
    it('combines master safe + master EOA amounts for native tokens', () => {
      const safeBigInt = '2000000000000000000'; // 2 XDAI
      const eoaBigInt = '1000000000000000000'; // 1 XDAI

      setupMocks({
        totalRequirements: buildRequirements({
          safeAddress: DEFAULT_SAFE_ADDRESS,
          nativeSafe: safeBigInt,
          nativeEoa: eoaBigInt,
        }),
      });

      const { result } = renderHook(() => useGetRefillRequirements());

      expect(result.current.totalTokenRequirements).toHaveLength(1);
      expect(result.current.totalTokenRequirements[0].symbol).toBe(
        TokenSymbolMap.XDAI,
      );
      // 2 + 1 = 3 XDAI
      expect(result.current.totalTokenRequirements[0].amount).toBe(3);
      expect(result.current.totalTokenRequirements[0].iconSrc).toBe(
        '/tokens/wxdai-icon.png',
      );
      expect(result.current.isLoading).toBe(false);
    });

    it('uses only master safe native amount when no EOA requirement exists', () => {
      const safeBigInt = '5000000000000000000'; // 5 XDAI

      setupMocks({
        totalRequirements: buildRequirements({
          safeAddress: DEFAULT_SAFE_ADDRESS,
          nativeSafe: safeBigInt,
        }),
      });

      const { result } = renderHook(() => useGetRefillRequirements());

      expect(result.current.totalTokenRequirements).toHaveLength(1);
      expect(result.current.totalTokenRequirements[0].symbol).toBe(
        TokenSymbolMap.XDAI,
      );
      expect(result.current.totalTokenRequirements[0].amount).toBe(5);
    });

    it('treats missing EOA native requirement as zero', () => {
      // EOA entry exists for a different token address (shouldn't happen in practice,
      // but tests the ?? 0 fallback on line 163)
      const requirements: Record<Address, Record<string, string>> = {
        [DEFAULT_SAFE_ADDRESS]: {
          [AddressZero]: '2000000000000000000', // 2 XDAI
        },
        // No EOA entry at all
      };

      setupMocks({ totalRequirements: requirements });

      const { result } = renderHook(() => useGetRefillRequirements());

      expect(result.current.totalTokenRequirements[0].amount).toBe(2);
    });
  });

  describe('ERC20 token requirements', () => {
    it('uses master safe amount directly for non-native tokens', () => {
      const olasAmount = '40000000000000000000'; // 40 OLAS

      setupMocks({
        totalRequirements: buildRequirements({
          safeAddress: DEFAULT_SAFE_ADDRESS,
          nativeSafe: '1000000000000000000',
          erc20Safe: olasAmount,
        }),
      });

      const { result } = renderHook(() => useGetRefillRequirements());

      const olasEntry = result.current.totalTokenRequirements.find(
        (t) => t.symbol === TokenSymbolMap.OLAS,
      );
      expect(olasEntry).toBeDefined();
      expect(olasEntry!.amount).toBe(40);
      expect(olasEntry!.iconSrc).toBe(
        TokenSymbolConfigMap[TokenSymbolMap.OLAS].image,
      );
    });
  });

  describe('MASTER_SAFE_REFILL_PLACEHOLDER fallback', () => {
    it('falls back to MASTER_SAFE_REFILL_PLACEHOLDER when no master safe exists', () => {
      const safeBigInt = '3000000000000000000'; // 3 XDAI

      setupMocks({
        getMasterSafeOf: () => undefined,
        totalRequirements: buildRequirements({
          safeAddress: MASTER_SAFE_REFILL_PLACEHOLDER,
          nativeSafe: safeBigInt,
        }),
      });

      const { result } = renderHook(() => useGetRefillRequirements());

      expect(result.current.totalTokenRequirements).toHaveLength(1);
      expect(result.current.totalTokenRequirements[0].symbol).toBe(
        TokenSymbolMap.XDAI,
      );
      expect(result.current.totalTokenRequirements[0].amount).toBe(3);
      expect(result.current.isLoading).toBe(false);
    });

    it('uses master safe address when safe exists (not the placeholder)', () => {
      // Requirements keyed by actual safe address, not placeholder
      setupMocks({
        totalRequirements: buildRequirements({
          safeAddress: DEFAULT_SAFE_ADDRESS,
          nativeSafe: '4000000000000000000', // 4 XDAI
        }),
      });

      const { result } = renderHook(() => useGetRefillRequirements());

      expect(result.current.totalTokenRequirements[0].amount).toBe(4);
    });
  });

  describe('filtering and sorting', () => {
    it('filters out zero-amount tokens', () => {
      setupMocks({
        totalRequirements: buildRequirements({
          safeAddress: DEFAULT_SAFE_ADDRESS,
          nativeSafe: '1000000000000000000', // 1 XDAI
          erc20Safe: '0', // 0 OLAS -> should be filtered
        }),
      });

      const { result } = renderHook(() => useGetRefillRequirements());

      expect(result.current.totalTokenRequirements).toHaveLength(1);
      expect(result.current.totalTokenRequirements[0].symbol).toBe(
        TokenSymbolMap.XDAI,
      );
    });

    // getTokensDetailsForFunding sorts by amount desc
    it('sorts tokens by amount descending', () => {
      const olasAmount = '40000000000000000000'; // 40 OLAS
      const nativeSafe = '500000000000000000'; // 0.5 XDAI

      setupMocks({
        totalRequirements: buildRequirements({
          safeAddress: DEFAULT_SAFE_ADDRESS,
          nativeSafe,
          erc20Safe: olasAmount,
        }),
      });

      const { result } = renderHook(() => useGetRefillRequirements());

      expect(result.current.totalTokenRequirements).toHaveLength(2);
      expect(result.current.totalTokenRequirements[0].symbol).toBe(
        TokenSymbolMap.OLAS,
      );
      expect(result.current.totalTokenRequirements[0].amount).toBe(40);
      expect(result.current.totalTokenRequirements[1].symbol).toBe(
        TokenSymbolMap.XDAI,
      );
      expect(result.current.totalTokenRequirements[1].amount).toBe(0.5);
    });

    it('includes multiple ERC20 tokens with native token, sorted descending', () => {
      const wxdaiAddress = GNOSIS_TOKEN_CONFIG[TokenSymbolMap.WXDAI]!
        .address as Address;
      const requirements: Record<string, Record<string, string>> = {
        [DEFAULT_SAFE_ADDRESS]: {
          [AddressZero]: '1000000000000000000', // 1 XDAI
          [OLAS_ADDRESS]: '50000000000000000000', // 50 OLAS
          [wxdaiAddress]: '30000000000000000000', // 30 WXDAI
        },
      };

      setupMocks({ totalRequirements: requirements });

      const { result } = renderHook(() => useGetRefillRequirements());

      expect(result.current.totalTokenRequirements).toHaveLength(3);
      // 50 OLAS > 30 WXDAI > 1 XDAI
      expect(result.current.totalTokenRequirements[0].amount).toBe(50);
      expect(result.current.totalTokenRequirements[0].symbol).toBe(
        TokenSymbolMap.OLAS,
      );
      expect(result.current.totalTokenRequirements[1].amount).toBe(30);
      expect(result.current.totalTokenRequirements[1].symbol).toBe(
        TokenSymbolMap.WXDAI,
      );
      expect(result.current.totalTokenRequirements[2].amount).toBe(1);
      expect(result.current.totalTokenRequirements[2].symbol).toBe(
        TokenSymbolMap.XDAI,
      );
    });
  });

  describe('refillTokenRequirements', () => {
    it('computes refillTokenRequirements from refillRequirements using getRequirementsPerToken', () => {
      const totalReqs = buildRequirements({
        safeAddress: DEFAULT_SAFE_ADDRESS,
        nativeSafe: '5000000000000000000', // 5 XDAI total
        erc20Safe: '40000000000000000000', // 40 OLAS total
      });
      const refillReqs = buildRequirements({
        safeAddress: DEFAULT_SAFE_ADDRESS,
        nativeSafe: '2000000000000000000', // 2 XDAI shortfall
        erc20Safe: '10000000000000000000', // 10 OLAS shortfall
      });

      setupMocks({
        totalRequirements: totalReqs,
        refillRequirements: refillReqs,
      });

      const { result } = renderHook(() => useGetRefillRequirements());

      // totalTokenRequirements should reflect totals
      expect(result.current.totalTokenRequirements).toHaveLength(2);
      const totalOlas = result.current.totalTokenRequirements.find(
        (t) => t.symbol === TokenSymbolMap.OLAS,
      );
      expect(totalOlas!.amount).toBe(40);

      // refillTokenRequirements should reflect shortfall
      expect(result.current.refillTokenRequirements).toHaveLength(2);
      const refillOlas = result.current.refillTokenRequirements.find(
        (t) => t.symbol === TokenSymbolMap.OLAS,
      );
      const refillXdai = result.current.refillTokenRequirements.find(
        (t) => t.symbol === TokenSymbolMap.XDAI,
      );
      expect(refillOlas!.amount).toBe(10);
      expect(refillXdai!.amount).toBe(2);
    });

    it('returns empty refillTokenRequirements when refillRequirements is undefined', () => {
      setupMocks({
        totalRequirements: VALID_REQUIREMENTS,
        refillRequirements: undefined,
      });

      const { result } = renderHook(() => useGetRefillRequirements());

      expect(result.current.refillTokenRequirements).toEqual([]);
    });

    it('combines master safe + master EOA native amounts in refillTokenRequirements', () => {
      const totalReqs = buildRequirements({
        safeAddress: DEFAULT_SAFE_ADDRESS,
        nativeSafe: '5000000000000000000',
        nativeEoa: '2000000000000000000',
      });
      const refillReqs = buildRequirements({
        safeAddress: DEFAULT_SAFE_ADDRESS,
        nativeSafe: '1000000000000000000', // 1 XDAI safe shortfall
        nativeEoa: '500000000000000000', // 0.5 XDAI EOA shortfall
      });

      setupMocks({
        totalRequirements: totalReqs,
        refillRequirements: refillReqs,
      });

      const { result } = renderHook(() => useGetRefillRequirements());

      expect(result.current.refillTokenRequirements).toHaveLength(1);
      // 1 + 0.5 = 1.5 XDAI
      expect(result.current.refillTokenRequirements[0].symbol).toBe(
        TokenSymbolMap.XDAI,
      );
      expect(result.current.refillTokenRequirements[0].amount).toBe(1.5);
    });
  });

  describe('isLoading flag', () => {
    it('returns isLoading=false when requirements resolve to non-empty', () => {
      setupMocks({ totalRequirements: VALID_REQUIREMENTS });

      const { result } = renderHook(() => useGetRefillRequirements());

      expect(result.current.isLoading).toBe(false);
    });

    it('returns isLoading=true when isBalancesAndFundingRequirementsLoading is true even with cached data', () => {
      // First render: valid data
      setupMocks({ totalRequirements: VALID_REQUIREMENTS });
      const { result, rerender } = renderHook(() => useGetRefillRequirements());
      expect(result.current.isLoading).toBe(false);

      // Switch to loading state
      mockUseBalanceContext.mockReturnValue({
        totalRequirements: VALID_REQUIREMENTS,
        resetQueryCache: mockResetQueryCache,
        isBalancesAndFundingRequirementsLoading: true,
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);
      rerender();

      // isLoading = isBalancesAndFundingRequirementsLoading || !totalTokenRequirements
      // = true || false = true
      expect(result.current.isLoading).toBe(true);
      // Cached data still available
      expect(result.current.totalTokenRequirements).toHaveLength(1);
    });
  });

  describe('caching behavior', () => {
    it('caches results and does not recalculate on re-render', () => {
      setupMocks({
        totalRequirements: buildRequirements({
          safeAddress: DEFAULT_SAFE_ADDRESS,
          nativeSafe: '2000000000000000000', // 2 XDAI
        }),
      });

      const { result, rerender } = renderHook(() => useGetRefillRequirements());

      expect(result.current.totalTokenRequirements).toHaveLength(1);
      expect(result.current.totalTokenRequirements[0].amount).toBe(2);

      // Update requirements upstream - cache prevents recalculation
      mockUseBalanceContext.mockReturnValue({
        totalRequirements: buildRequirements({
          safeAddress: DEFAULT_SAFE_ADDRESS,
          nativeSafe: '9000000000000000000', // 9 XDAI
        }),
        resetQueryCache: mockResetQueryCache,
        isBalancesAndFundingRequirementsLoading: false,
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);

      rerender();

      // Still shows cached value (2 XDAI), not 9
      expect(result.current.totalTokenRequirements[0].amount).toBe(2);
    });

    it('resets cache when selectedServiceConfigId changes', () => {
      setupMocks({
        totalRequirements: buildRequirements({
          safeAddress: DEFAULT_SAFE_ADDRESS,
          nativeSafe: '2000000000000000000', // 2 XDAI
        }),
      });

      const { result, rerender } = renderHook(() => useGetRefillRequirements());

      expect(result.current.totalTokenRequirements[0].amount).toBe(2);

      // Change selectedServiceConfigId and provide new requirements
      mockUseServices.mockReturnValue({
        selectedAgentConfig: defaultSelectedAgentConfig,
        selectedServiceConfigId: MOCK_SERVICE_CONFIG_ID_2,
      } as ReturnType<typeof useServices>);
      mockUseBalanceContext.mockReturnValue({
        totalRequirements: buildRequirements({
          safeAddress: DEFAULT_SAFE_ADDRESS,
          nativeSafe: '7000000000000000000', // 7 XDAI
        }),
        resetQueryCache: mockResetQueryCache,
        isBalancesAndFundingRequirementsLoading: false,
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);

      rerender();

      // Cache was cleared by selectedServiceConfigId change, so new value appears
      expect(result.current.totalTokenRequirements[0].amount).toBe(7);
    });
  });

  describe('resetTokenRequirements', () => {
    it('clears cached requirements and calls resetQueryCache', () => {
      setupMocks({
        totalRequirements: buildRequirements({
          safeAddress: DEFAULT_SAFE_ADDRESS,
          nativeSafe: '4000000000000000000', // 4 XDAI
        }),
      });

      const { result, rerender } = renderHook(() => useGetRefillRequirements());

      expect(result.current.totalTokenRequirements[0].amount).toBe(4);

      // Update upstream data
      mockUseBalanceContext.mockReturnValue({
        totalRequirements: buildRequirements({
          safeAddress: DEFAULT_SAFE_ADDRESS,
          nativeSafe: '8000000000000000000', // 8 XDAI
        }),
        resetQueryCache: mockResetQueryCache,
        isBalancesAndFundingRequirementsLoading: false,
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);

      // Call resetTokenRequirements to clear cache
      act(() => {
        result.current.resetTokenRequirements();
      });

      expect(mockResetQueryCache).toHaveBeenCalledTimes(1);

      // After reset + rerender, new data is picked up
      rerender();

      expect(result.current.totalTokenRequirements[0].amount).toBe(8);
    });

    it('returns a stable callback reference', () => {
      setupMocks({ totalRequirements: VALID_REQUIREMENTS });

      const { result, rerender } = renderHook(() => useGetRefillRequirements());

      const firstRef = result.current.resetTokenRequirements;

      rerender();

      expect(result.current.resetTokenRequirements).toBe(firstRef);
    });
  });

  describe('guard conditions in getRequirementsPerToken', () => {
    it('returns empty requirements when masterEoa is undefined', () => {
      setupMocks({
        masterEoa: undefined as unknown as ReturnType<
          typeof useMasterWalletContext
        >['masterEoa'],
        totalRequirements: VALID_REQUIREMENTS,
        isLoading: true,
      });

      const { result } = renderHook(() => useGetRefillRequirements());

      expect(result.current.totalTokenRequirements).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it('returns empty requirements when isMasterWalletsFetched is false', () => {
      setupMocks({
        isFetched: false,
        totalRequirements: VALID_REQUIREMENTS,
        isLoading: true,
      });

      const { result } = renderHook(() => useGetRefillRequirements());

      expect(result.current.totalTokenRequirements).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it('returns empty requirements when masterSafeRequirements is not found for wallet', () => {
      // totalRequirements contains an entry keyed by a different address
      // than the master safe or the placeholder, so masterSafeRequirements is undefined
      const requirements: Record<string, Record<string, string>> = {
        '0xUnrelatedAddress': {
          [AddressZero]: '1000000000000000000',
        },
      };

      setupMocks({ totalRequirements: requirements });

      const { result } = renderHook(() => useGetRefillRequirements());

      // No matching requirements found -> empty array stored
      expect(result.current.totalTokenRequirements).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
