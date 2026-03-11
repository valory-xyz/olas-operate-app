import { renderHook } from '@testing-library/react';

import {
  ETHEREUM_TOKEN_CONFIG,
  GNOSIS_TOKEN_CONFIG,
  TOKEN_CONFIG,
  TokenSymbolMap,
} from '../../config/tokens';
import { AddressZero } from '../../constants/address';
import {
  AllEvmChainIdMap,
  EvmChainId,
  EvmChainIdMap,
  MiddlewareChainMap,
} from '../../constants/chains';
import { MASTER_SAFE_REFILL_PLACEHOLDER } from '../../constants/defaults';
import { useBalanceAndRefillRequirementsContext } from '../../hooks/useBalanceAndRefillRequirementsContext';
import { useGetBridgeRequirementsParams } from '../../hooks/useGetBridgeRequirementsParams';
import { useServices } from '../../hooks/useServices';
import { useMasterWalletContext } from '../../hooks/useWallet';
import { Address } from '../../types/Address';
import {
  AddressBalanceRecord,
  MasterSafeBalanceRecord,
} from '../../types/Funding';
import {
  BACKUP_SIGNER_ADDRESS,
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  makeMasterEoa,
  makeMasterSafe,
  UNKNOWN_TOKEN_ADDRESS,
} from '../helpers/factories';

// --- Constants ---

const GNOSIS_OLAS_ADDRESS = GNOSIS_TOKEN_CONFIG[TokenSymbolMap.OLAS]!
  .address as Address;
const ETHEREUM_OLAS_ADDRESS = ETHEREUM_TOKEN_CONFIG[TokenSymbolMap.OLAS]!
  .address as Address;
const GNOSIS_CHAIN_ID = EvmChainIdMap.Gnosis;

// --- Mocks ---

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({ providers: [] }));

jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));
jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));
jest.mock('../../hooks/useBalanceAndRefillRequirementsContext', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn(),
}));

const mockUseServices = useServices as jest.Mock;
const mockUseMasterWalletContext = useMasterWalletContext as jest.Mock;
const mockUseBalanceAndRefillRequirementsContext =
  useBalanceAndRefillRequirementsContext as jest.Mock;

// --- Helpers ---

const defaultSelectedAgentConfig = {
  evmHomeChainId: GNOSIS_CHAIN_ID,
  middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
} as ReturnType<typeof useServices>['selectedAgentConfig'];

type SetupMocksOptions = {
  masterEoa?: ReturnType<typeof makeMasterEoa> | null;
  masterSafe?: ReturnType<typeof makeMasterSafe> | null;
  isFetched?: boolean;
  isLoading?: boolean;
  refillRequirements?:
    | (AddressBalanceRecord & MasterSafeBalanceRecord)
    | AddressBalanceRecord
    | undefined;
};

function setupMocks(options: SetupMocksOptions = {}) {
  const { isFetched = true, isLoading = false } = options;

  const masterEoa =
    'masterEoa' in options ? (options.masterEoa ?? undefined) : makeMasterEoa();
  const masterSafe =
    'masterSafe' in options
      ? (options.masterSafe ?? undefined)
      : makeMasterSafe(GNOSIS_CHAIN_ID);

  const refillRequirements =
    'refillRequirements' in options ? options.refillRequirements : {};

  const getMasterSafeOf = jest.fn((chainId: EvmChainId) =>
    masterSafe?.evmChainId === chainId ? masterSafe : undefined,
  );

  mockUseServices.mockReturnValue({
    selectedAgentConfig: defaultSelectedAgentConfig,
  });

  mockUseMasterWalletContext.mockReturnValue({
    masterEoa,
    getMasterSafeOf,
    isFetched,
  });

  mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
    refillRequirements,
    isBalancesAndFundingRequirementsLoading: isLoading,
  });

  return { getMasterSafeOf };
}

// --- Tests ---

describe('useGetBridgeRequirementsParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when loading', () => {
    setupMocks({ isLoading: true });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    expect(result.current()).toBeNull();
  });

  it('returns null when refillRequirements is undefined', () => {
    setupMocks({ refillRequirements: undefined });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    expect(result.current()).toBeNull();
  });

  it('returns null when masterEoa (fromAddress) is undefined', () => {
    setupMocks({ masterEoa: null });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    expect(result.current()).toBeNull();
  });

  it('returns null when toAddress is undefined (no masterEoa)', () => {
    // toAddress = masterSafe?.address ?? masterEoa?.address
    // If masterEoa is null, fromAddress is also null, so it's null regardless
    setupMocks({ masterEoa: null, masterSafe: null });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    expect(result.current()).toBeNull();
  });

  it('creates bridge request from master safe requirements (address key)', () => {
    const refillRequirements: AddressBalanceRecord = {
      [DEFAULT_SAFE_ADDRESS]: {
        [GNOSIS_OLAS_ADDRESS]: '40000000000000000000', // 40 OLAS
      },
    };
    setupMocks({ refillRequirements });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    const request = result.current();
    expect(request).not.toBeNull();
    expect(request!.bridge_requests).toHaveLength(1);

    const bridgeReq = request!.bridge_requests[0];
    expect(bridgeReq.from.chain).toBe(MiddlewareChainMap.ETHEREUM);
    expect(bridgeReq.from.address).toBe(DEFAULT_EOA_ADDRESS);
    expect(bridgeReq.to.chain).toBe(MiddlewareChainMap.GNOSIS);
    expect(bridgeReq.to.address).toBe(DEFAULT_SAFE_ADDRESS);
    expect(bridgeReq.to.amount).toBe('40000000000000000000');
  });

  it('creates bridge request from MASTER_SAFE_REFILL_PLACEHOLDER when no safe', () => {
    const refillRequirements = {
      [MASTER_SAFE_REFILL_PLACEHOLDER]: {
        [GNOSIS_OLAS_ADDRESS]: '40000000000000000000', // 40 OLAS
      },
    } as unknown as AddressBalanceRecord & MasterSafeBalanceRecord;
    setupMocks({ refillRequirements, masterSafe: null });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    const request = result.current();
    expect(request).not.toBeNull();
    expect(request!.bridge_requests).toHaveLength(1);

    const bridgeReq = request!.bridge_requests[0];
    expect(bridgeReq.to.address).toBe(DEFAULT_EOA_ADDRESS);
    expect(bridgeReq.to.amount).toBe('40000000000000000000');
  });

  it('skips zero amounts', () => {
    const refillRequirements: AddressBalanceRecord = {
      [DEFAULT_SAFE_ADDRESS]: {
        [GNOSIS_OLAS_ADDRESS]: '0',
      },
    };
    setupMocks({ refillRequirements });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    const request = result.current();
    expect(request).not.toBeNull();
    expect(request!.bridge_requests).toHaveLength(0);
  });

  it('skips invalid token addresses (non-hex strings)', () => {
    const refillRequirements: AddressBalanceRecord = {
      [DEFAULT_SAFE_ADDRESS]: {
        not_a_valid_address: '1000',
      } as Record<string, string>,
    };
    setupMocks({ refillRequirements });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    const request = result.current();
    expect(request).not.toBeNull();
    expect(request!.bridge_requests).toHaveLength(0);
  });

  it('deduplicates bridge requests by summing amounts for same chain/address/token', () => {
    // Without a masterSafe, toAddress falls back to masterEoa.
    // Entries keyed by EOA pass via isRecipientAddress, entries keyed by
    // MASTER_SAFE_REFILL_PLACEHOLDER pass via isMasterSafeAddress.
    // Both resolve to the same toAddress (EOA), so they get deduplicated.
    const refillRequirements = {
      [DEFAULT_EOA_ADDRESS]: {
        [GNOSIS_OLAS_ADDRESS]: '15000000000000000000', // 15 OLAS
      },
      [MASTER_SAFE_REFILL_PLACEHOLDER]: {
        [GNOSIS_OLAS_ADDRESS]: '25000000000000000000', // 25 OLAS
      },
    } as unknown as AddressBalanceRecord & MasterSafeBalanceRecord;
    setupMocks({ refillRequirements, masterSafe: null });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    const request = result.current();
    expect(request).not.toBeNull();
    expect(request!.bridge_requests).toHaveLength(1);

    const bridgeReq = request!.bridge_requests[0];
    // 15 OLAS + 25 OLAS = 40 OLAS
    expect(bridgeReq.to.amount).toBe('40000000000000000000');
  });

  it('sets force_update from isForceUpdate parameter', () => {
    const refillRequirements: AddressBalanceRecord = {
      [DEFAULT_SAFE_ADDRESS]: {
        [GNOSIS_OLAS_ADDRESS]: '40000000000000000000', // 40 OLAS
      },
    };
    setupMocks({ refillRequirements });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    const requestDefault = result.current();
    expect(requestDefault!.force_update).toBe(false);

    const requestForced = result.current(true);
    expect(requestForced!.force_update).toBe(true);
  });

  it('combines native token requirements (master safe + EOA) via internal hook', () => {
    // The internal useCombineNativeTokenRequirements sums native token amounts
    // from master safe + master EOA refill requirements.
    // Realistic gas refill: 0.3 XDAI for safe + 0.2 XDAI for EOA
    const refillRequirements = {
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: '300000000000000000', // 0.3 XDAI
      },
      [DEFAULT_EOA_ADDRESS]: {
        [AddressZero]: '200000000000000000', // 0.2 XDAI
      },
    } as AddressBalanceRecord;
    setupMocks({ refillRequirements });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    const request = result.current();
    expect(request).not.toBeNull();

    const nativeBridgeReq = request!.bridge_requests.find(
      (req) => req.to.token === AddressZero,
    );
    expect(nativeBridgeReq).toBeDefined();
    // useCombineNativeTokenRequirements: 0.3 + 0.2 = 0.5 XDAI
    expect(nativeBridgeReq!.to.amount).toBe('500000000000000000');
  });

  it('uses masterSafe address for toAddress when available', () => {
    const refillRequirements: AddressBalanceRecord = {
      [DEFAULT_SAFE_ADDRESS]: {
        [GNOSIS_OLAS_ADDRESS]: '40000000000000000000', // 40 OLAS
      },
    };
    setupMocks({ refillRequirements });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    const request = result.current();
    expect(request!.bridge_requests[0].to.address).toBe(DEFAULT_SAFE_ADDRESS);
  });

  it('falls back to masterEoa for toAddress when no masterSafe', () => {
    const refillRequirements = {
      [MASTER_SAFE_REFILL_PLACEHOLDER]: {
        [GNOSIS_OLAS_ADDRESS]: '40000000000000000000', // 40 OLAS
      },
    } as unknown as AddressBalanceRecord & MasterSafeBalanceRecord;
    setupMocks({ refillRequirements, masterSafe: null });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    const request = result.current();
    expect(request!.bridge_requests[0].to.address).toBe(DEFAULT_EOA_ADDRESS);
    expect(request!.bridge_requests[0].from.address).toBe(DEFAULT_EOA_ADDRESS);
  });

  it('skips wallet addresses that are neither masterEoa, masterSafe, nor placeholder', () => {
    const refillRequirements: AddressBalanceRecord = {
      [BACKUP_SIGNER_ADDRESS]: {
        [GNOSIS_OLAS_ADDRESS]: '40000000000000000000', // 40 OLAS
      },
    };
    setupMocks({ refillRequirements });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    const request = result.current();
    expect(request).not.toBeNull();
    expect(request!.bridge_requests).toHaveLength(0);
  });

  it('resolves fromToken using getFromToken when no defaultFromToken', () => {
    // For OLAS on Gnosis, getFromToken should resolve to Ethereum OLAS address
    const refillRequirements: AddressBalanceRecord = {
      [DEFAULT_SAFE_ADDRESS]: {
        [GNOSIS_OLAS_ADDRESS]: '40000000000000000000', // 40 OLAS
      },
    };
    setupMocks({ refillRequirements });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    const request = result.current();
    expect(request).not.toBeNull();
    // getFromToken resolves Gnosis OLAS -> Ethereum OLAS address
    const ethereumOlasAddress =
      TOKEN_CONFIG[EvmChainIdMap.Gnosis].OLAS!.address;
    // The from token should be the Ethereum OLAS (since fromChainConfig is ETHEREUM_TOKEN_CONFIG)
    // getFromToken looks up symbol on toChain (Gnosis) -> 'OLAS', then finds 'OLAS' on fromChain (Ethereum)
    expect(request!.bridge_requests[0].from.token).toBeDefined();
    // Ethereum OLAS address from ETHEREUM_TOKEN_CONFIG
    expect(request!.bridge_requests[0].from.token).toBe(ETHEREUM_OLAS_ADDRESS);
    // Sanity: to.token is the Gnosis OLAS address
    expect(request!.bridge_requests[0].to.token).toBe(ethereumOlasAddress);
  });

  it('uses defaultFromToken when provided', () => {
    const refillRequirements: AddressBalanceRecord = {
      [DEFAULT_SAFE_ADDRESS]: {
        [GNOSIS_OLAS_ADDRESS]: '40000000000000000000', // 40 OLAS
      },
    };
    setupMocks({ refillRequirements });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(
        AllEvmChainIdMap.Ethereum,
        UNKNOWN_TOKEN_ADDRESS,
      ),
    );

    const request = result.current();
    expect(request).not.toBeNull();
    expect(request!.bridge_requests[0].from.token).toBe(UNKNOWN_TOKEN_ADDRESS);
  });

  it('handles multiple tokens in a single wallet creating separate bridge requests', () => {
    // Realistic: 0.3 XDAI safe gas + 40 OLAS staking + 0.2 XDAI EOA gas
    const refillRequirements: AddressBalanceRecord = {
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: '300000000000000000', // 0.3 XDAI
        [GNOSIS_OLAS_ADDRESS]: '40000000000000000000', // 40 OLAS
      },
      [DEFAULT_EOA_ADDRESS]: {
        [AddressZero]: '200000000000000000', // 0.2 XDAI
      },
    };
    setupMocks({ refillRequirements });

    const { result } = renderHook(() =>
      useGetBridgeRequirementsParams(AllEvmChainIdMap.Ethereum),
    );

    const request = result.current();
    expect(request).not.toBeNull();
    // Native token and OLAS should produce 2 bridge requests
    // (native deduplicated between safe and EOA)
    const olasRequest = request!.bridge_requests.find(
      (req) => req.to.token === GNOSIS_OLAS_ADDRESS,
    );
    const nativeRequest = request!.bridge_requests.find(
      (req) => req.to.token === AddressZero,
    );
    expect(olasRequest).toBeDefined();
    expect(nativeRequest).toBeDefined();
    expect(olasRequest!.to.amount).toBe('40000000000000000000');
    // Native: 0.3 + 0.2 = 0.5 XDAI
    expect(nativeRequest!.to.amount).toBe('500000000000000000');
  });
});
