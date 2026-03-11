import { renderHook } from '@testing-library/react';

import { GNOSIS_TOKEN_CONFIG, TokenSymbolMap } from '../../config/tokens';
import { EvmChainId, EvmChainIdMap, MiddlewareChainMap } from '../../constants';
import { AddressZero } from '../../constants/address';
import { usePearlWallet } from '../../context/PearlWalletProvider';
import { useGetOnRampRequirementsParams } from '../../hooks/useGetOnRampRequirementsParams';
import { useMasterWalletContext } from '../../hooks/useWallet';
import { Address } from '../../types/Address';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  makeMasterEoa,
  makeMasterSafe,
} from '../helpers/factories';

// --- Mocks ---

jest.mock('ethers-multicall', () => ({
  setMulticallAddress: jest.fn(),
  Provider: jest.fn().mockImplementation(() => ({})),
  Contract: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({ providers: [] }));

jest.mock('../../context/PearlWalletProvider', () => ({
  usePearlWallet: jest.fn(),
}));
jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));

const GNOSIS_OLAS_ADDRESS = GNOSIS_TOKEN_CONFIG[TokenSymbolMap.OLAS]!
  .address as Address;

// config/tokens is NOT mocked: the real TOKEN_CONFIG is used so that
// transitive imports (e.g. serviceTemplates) resolve correctly.

// --- Typed mock accessors ---

const mockUsePearlWallet = usePearlWallet as jest.MockedFunction<
  typeof usePearlWallet
>;
const mockUseMasterWalletContext =
  useMasterWalletContext as jest.MockedFunction<typeof useMasterWalletContext>;

// --- Helpers ---

const ON_RAMP_CHAIN_ID: EvmChainId = EvmChainIdMap.Base;
const WALLET_CHAIN_ID: EvmChainId = EvmChainIdMap.Gnosis;

type SetupMocksOptions = {
  walletChainId?: EvmChainId | null;
  masterEoa?: ReturnType<typeof makeMasterEoa> | null;
  masterSafe?: ReturnType<typeof makeMasterSafe> | null;
  isFetched?: boolean;
};

/** Sets up the mocks with reasonable defaults. Use `null` to omit a value. */
const setupMocks = (options: SetupMocksOptions = {}) => {
  const { walletChainId = WALLET_CHAIN_ID, isFetched = true } = options;

  const masterEoa =
    'masterEoa' in options ? (options.masterEoa ?? undefined) : makeMasterEoa();
  const masterSafe =
    'masterSafe' in options
      ? (options.masterSafe ?? undefined)
      : makeMasterSafe(WALLET_CHAIN_ID);

  mockUsePearlWallet.mockReturnValue({
    walletChainId,
  } as ReturnType<typeof usePearlWallet>);

  const getMasterSafeOf = jest.fn((chainId: EvmChainId) =>
    masterSafe?.evmChainId === chainId ? masterSafe : undefined,
  );

  mockUseMasterWalletContext.mockReturnValue({
    masterEoa,
    getMasterSafeOf,
    isFetched,
  } as unknown as ReturnType<typeof useMasterWalletContext>);

  return { getMasterSafeOf };
};

// --- Tests ---

describe('useGetOnRampRequirementsParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when masterEoa is undefined', () => {
    setupMocks({ masterEoa: null });

    const { result } = renderHook(() =>
      useGetOnRampRequirementsParams(ON_RAMP_CHAIN_ID),
    );

    const bridgeRequest = result.current(GNOSIS_OLAS_ADDRESS, 10);
    expect(bridgeRequest).toBeNull();
  });

  it('returns null when isMasterWalletFetched is false', () => {
    setupMocks({ isFetched: false });

    const { result } = renderHook(() =>
      useGetOnRampRequirementsParams(ON_RAMP_CHAIN_ID),
    );

    const bridgeRequest = result.current(GNOSIS_OLAS_ADDRESS, 10);
    expect(bridgeRequest).toBeNull();
  });

  it('returns null when walletChainId is undefined (no toChainConfig/toChain)', () => {
    setupMocks({ walletChainId: null });

    const { result } = renderHook(() =>
      useGetOnRampRequirementsParams(ON_RAMP_CHAIN_ID),
    );

    const bridgeRequest = result.current(GNOSIS_OLAS_ADDRESS, 10);
    expect(bridgeRequest).toBeNull();
  });

  it('constructs correct BridgeRequest with master safe address as toAddress', () => {
    setupMocks();

    const { result } = renderHook(() =>
      useGetOnRampRequirementsParams(ON_RAMP_CHAIN_ID),
    );

    const amount = 5;
    const bridgeRequest = result.current(GNOSIS_OLAS_ADDRESS, amount);

    expect(bridgeRequest).not.toBeNull();
    expect(bridgeRequest!.to.address).toBe(DEFAULT_SAFE_ADDRESS);
    expect(bridgeRequest!.from.address).toBe(DEFAULT_EOA_ADDRESS);
    expect(bridgeRequest!.to.token).toBe(GNOSIS_OLAS_ADDRESS);
  });

  it('falls back to masterEoa address for toAddress when no master safe', () => {
    setupMocks({ masterSafe: null });

    const { result } = renderHook(() =>
      useGetOnRampRequirementsParams(ON_RAMP_CHAIN_ID),
    );

    const bridgeRequest = result.current(GNOSIS_OLAS_ADDRESS, 5);

    expect(bridgeRequest).not.toBeNull();
    expect(bridgeRequest!.to.address).toBe(DEFAULT_EOA_ADDRESS);
    expect(bridgeRequest!.from.address).toBe(DEFAULT_EOA_ADDRESS);
  });

  it('uses AddressZero as from.token', () => {
    setupMocks();

    const { result } = renderHook(() =>
      useGetOnRampRequirementsParams(ON_RAMP_CHAIN_ID),
    );

    const bridgeRequest = result.current(GNOSIS_OLAS_ADDRESS, 1);

    expect(bridgeRequest).not.toBeNull();
    expect(bridgeRequest!.from.token).toBe(AddressZero);
  });

  it('uses correct middleware chain for from.chain and to.chain', () => {
    setupMocks();

    const { result } = renderHook(() =>
      useGetOnRampRequirementsParams(ON_RAMP_CHAIN_ID),
    );

    const bridgeRequest = result.current(GNOSIS_OLAS_ADDRESS, 1);

    expect(bridgeRequest).not.toBeNull();
    expect(bridgeRequest!.from.chain).toBe(MiddlewareChainMap.BASE);
    expect(bridgeRequest!.to.chain).toBe(MiddlewareChainMap.GNOSIS);
  });

  it('calls parseUnits with correct token decimals', () => {
    setupMocks();

    const { result } = renderHook(() =>
      useGetOnRampRequirementsParams(ON_RAMP_CHAIN_ID),
    );

    const amount = 3;
    const bridgeRequest = result.current(GNOSIS_OLAS_ADDRESS, amount);

    expect(bridgeRequest).not.toBeNull();
    // OLAS on Gnosis has 18 decimals, so parseUnits(3, 18) = "3000000000000000000"
    expect(bridgeRequest!.to.amount).toBe('3000000000000000000');
  });
});
