import { renderHook } from '@testing-library/react';

import { GNOSIS_TOKEN_CONFIG, TokenSymbolMap } from '../../../../config/tokens';
import { AddressZero } from '../../../../constants/address';
import { EvmChainIdMap } from '../../../../constants/chains';
import { useOnRampContext } from '../../../../hooks/useOnRampContext';
import { BridgeRefillRequirementsRequest } from '../../../../types/Bridge';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
} from '../../../helpers/factories';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({ providers: [] }));

jest.mock('../../../../hooks/useOnRampContext', () => ({
  useOnRampContext: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Typed mock accessors
// ---------------------------------------------------------------------------

const mockUseOnRampContext = useOnRampContext as jest.MockedFunction<
  typeof useOnRampContext
>;

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  useBridgeRequirementsUtils,
} = require('../../../../components/OnRamp/hooks/useBridgeRequirementsUtils');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GNOSIS_OLAS_ADDRESS = GNOSIS_TOKEN_CONFIG[TokenSymbolMap.OLAS]!.address!;

const makeBridgeParams = (
  overrides: Partial<BridgeRefillRequirementsRequest> = {},
): BridgeRefillRequirementsRequest => ({
  bridge_requests: [
    {
      from: {
        chain: 'base' as never,
        address: DEFAULT_EOA_ADDRESS,
        token: AddressZero,
      },
      to: {
        chain: 'gnosis' as never,
        address: DEFAULT_SAFE_ADDRESS,
        token: AddressZero,
        amount: '10000000000000000',
      },
    },
    {
      from: {
        chain: 'base' as never,
        address: DEFAULT_EOA_ADDRESS,
        token: AddressZero,
      },
      to: {
        chain: 'gnosis' as never,
        address: DEFAULT_SAFE_ADDRESS,
        token: GNOSIS_OLAS_ADDRESS,
        amount: '5000000000000000000',
      },
    },
  ],
  force_update: false,
  ...overrides,
});

const setupMock = (selectedChainId: number | null = EvmChainIdMap.Gnosis) => {
  mockUseOnRampContext.mockReturnValue({
    selectedChainId,
  } as ReturnType<typeof useOnRampContext>);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBridgeRequirementsUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canIgnoreNativeToken', () => {
    it('is true when onRampChainId equals selectedChainId', () => {
      setupMock(EvmChainIdMap.Optimism);

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Optimism),
      );

      expect(result.current.canIgnoreNativeToken).toBe(true);
    });

    it('is false when onRampChainId differs from selectedChainId', () => {
      setupMock(EvmChainIdMap.Gnosis);

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Base),
      );

      expect(result.current.canIgnoreNativeToken).toBe(false);
    });
  });

  describe('getReceivingTokens', () => {
    it('returns empty array when bridgeParams is null', () => {
      setupMock();

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Base),
      );

      expect(result.current.getReceivingTokens(null)).toEqual([]);
    });

    it('returns empty array when selectedChainId is null', () => {
      setupMock(null);

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Base),
      );

      const params = makeBridgeParams();
      expect(result.current.getReceivingTokens(params)).toEqual([]);
    });

    it('maps bridge requests to receiving tokens with amounts and symbols', () => {
      setupMock(EvmChainIdMap.Gnosis);

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Base),
      );

      const params = makeBridgeParams();
      const tokens = result.current.getReceivingTokens(params);

      expect(tokens).toHaveLength(2);
      // First token: native (AddressZero) on Gnosis = XDAI, 0.01 ETH
      expect(tokens[0].symbol).toBe(TokenSymbolMap.XDAI);
      expect(tokens[0].amount).toBe(0.01);
      // Second token: OLAS, 5 OLAS
      expect(tokens[1].symbol).toBe(TokenSymbolMap.OLAS);
      expect(tokens[1].amount).toBe(5);
    });
  });

  describe('getTokensToBeBridged', () => {
    it('returns empty array for empty receivingTokens', () => {
      setupMock();

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Base),
      );

      expect(result.current.getTokensToBeBridged([])).toEqual([]);
    });

    it('returns empty array when selectedChainId is null', () => {
      setupMock(null);

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Base),
      );

      const receivingTokens = [{ symbol: TokenSymbolMap.ETH, amount: 0.01 }];
      expect(result.current.getTokensToBeBridged(receivingTokens)).toEqual([]);
    });

    it('returns all token symbols when canIgnoreNativeToken is false (chains differ)', () => {
      setupMock(EvmChainIdMap.Gnosis);

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Base),
      );

      const receivingTokens = [
        { symbol: TokenSymbolMap.XDAI, amount: 0.01 },
        { symbol: TokenSymbolMap.OLAS, amount: 5 },
      ];
      const bridged = result.current.getTokensToBeBridged(receivingTokens);
      expect(bridged).toEqual([TokenSymbolMap.XDAI, TokenSymbolMap.OLAS]);
    });

    it('filters out native token when canIgnoreNativeToken is true (chains match)', () => {
      // Optimism → Optimism: ETH is native, can ignore
      setupMock(EvmChainIdMap.Optimism);

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Optimism),
      );

      const receivingTokens = [
        { symbol: TokenSymbolMap.ETH, amount: 0.01 },
        { symbol: TokenSymbolMap.OLAS, amount: 5 },
      ];
      const bridged = result.current.getTokensToBeBridged(receivingTokens);
      // ETH is the native symbol for Optimism, so it's filtered out
      expect(bridged).toEqual([TokenSymbolMap.OLAS]);
    });

    it('returns empty when all tokens are native and canIgnoreNativeToken is true', () => {
      setupMock(EvmChainIdMap.Base);

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Base),
      );

      const receivingTokens = [{ symbol: TokenSymbolMap.ETH, amount: 0.5 }];
      const bridged = result.current.getTokensToBeBridged(receivingTokens);
      expect(bridged).toEqual([]);
    });
  });

  describe('getBridgeParamsExceptNativeToken', () => {
    it('returns null when bridgeParams is null', () => {
      setupMock();

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Base),
      );

      expect(result.current.getBridgeParamsExceptNativeToken(null)).toBeNull();
    });

    it('filters out AddressZero requests when canIgnoreNativeToken is true', () => {
      setupMock(EvmChainIdMap.Optimism);

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Optimism),
      );

      const params = makeBridgeParams();
      const filtered = result.current.getBridgeParamsExceptNativeToken(params);

      // Only the OLAS request (non-native) should remain
      expect(filtered.bridge_requests).toHaveLength(1);
      expect(filtered.bridge_requests[0].to.token).toBe(GNOSIS_OLAS_ADDRESS);
      expect(filtered.force_update).toBe(false);
    });

    it('keeps all requests when canIgnoreNativeToken is false', () => {
      setupMock(EvmChainIdMap.Gnosis);

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Base),
      );

      const params = makeBridgeParams();
      const filtered = result.current.getBridgeParamsExceptNativeToken(params);

      // All requests should remain
      expect(filtered.bridge_requests).toHaveLength(2);
    });

    it('preserves force_update flag', () => {
      setupMock(EvmChainIdMap.Optimism);

      const { result } = renderHook(() =>
        useBridgeRequirementsUtils(EvmChainIdMap.Optimism),
      );

      const params = makeBridgeParams({ force_update: true });
      const filtered = result.current.getBridgeParamsExceptNativeToken(params);
      expect(filtered.force_update).toBe(true);
    });
  });
});
