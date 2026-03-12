import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';

import { useTokensFundingStatus } from '../../../../../components/SetupPage/FundYourAgent/hooks/useTokensFundingStatus';
import { EvmChainIdMap } from '../../../../../constants/chains';
import { useGetRefillRequirements } from '../../../../../hooks/useGetRefillRequirements';
import { useMasterBalances } from '../../../../../hooks/useMasterBalances';
import { useServices } from '../../../../../hooks/useServices';
import { TokenRequirement } from '../../../../../types';
import { DEFAULT_EOA_ADDRESS } from '../../../../helpers/factories';

jest.mock('ethers-multicall', () => ({ Contract: jest.fn() }));
jest.mock('../../../../../constants/providers', () => ({}));
jest.mock('../../../../../config/providers', () => ({ providers: [] }));

jest.mock('../../../../../hooks/useGetRefillRequirements', () => ({
  useGetRefillRequirements: jest.fn(),
}));
jest.mock('../../../../../hooks/useMasterBalances', () => ({
  useMasterBalances: jest.fn(),
}));
jest.mock('../../../../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));

const mockUseGetRefillRequirements =
  useGetRefillRequirements as jest.MockedFunction<
    typeof useGetRefillRequirements
  >;
const mockUseMasterBalances = useMasterBalances as jest.MockedFunction<
  typeof useMasterBalances
>;
const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;

// ---------- test data ----------

const GNOSIS_CHAIN_ID = EvmChainIdMap.Gnosis;

const olasRequirement: TokenRequirement = {
  amount: 100,
  symbol: 'OLAS',
  iconSrc: '/tokens/olas-icon.png',
};

const xdaiRequirement: TokenRequirement = {
  amount: 11.5,
  symbol: 'XDAI',
  iconSrc: '/tokens/wxdai-icon.png',
};

const twoTokenRequirements: TokenRequirement[] = [
  olasRequirement,
  xdaiRequirement,
];

const makeWalletBalance = (symbol: string, balance: number) => ({
  walletAddress: DEFAULT_EOA_ADDRESS,
  evmChainId: GNOSIS_CHAIN_ID,
  symbol,
  isNative: symbol === 'XDAI',
  balance,
});

// ---------- default mock returns ----------

const defaultRefillReturn = {
  totalTokenRequirements: [] as TokenRequirement[],
  isLoading: false,
  resetTokenRequirements: jest.fn(),
};

const defaultMasterBalancesReturn = {
  isLoaded: true,
  getMasterEoaBalancesOf: jest.fn().mockReturnValue([]),
  getMasterSafeBalancesOf: jest.fn().mockReturnValue([]),
  getMasterEoaNativeBalanceOf: jest.fn(),
  getMasterSafeNativeBalanceOf: jest.fn(),
  getMasterSafeOlasBalanceOfInStr: jest.fn(),
  getMasterSafeErc20BalancesInStr: jest.fn(),
  isMasterEoaLowOnGas: false,
  masterEoaGasRequirement: undefined,
};

const defaultServicesReturn = {
  selectedAgentConfig: { evmHomeChainId: GNOSIS_CHAIN_ID },
};

// ---------- helpers ----------

const setupMocks = (
  overrides: {
    refill?: Partial<typeof defaultRefillReturn>;
    balances?: Partial<typeof defaultMasterBalancesReturn>;
    services?: Partial<typeof defaultServicesReturn>;
  } = {},
) => {
  mockUseGetRefillRequirements.mockReturnValue({
    ...defaultRefillReturn,
    ...overrides.refill,
  } as ReturnType<typeof useGetRefillRequirements>);
  mockUseMasterBalances.mockReturnValue({
    ...defaultMasterBalancesReturn,
    ...overrides.balances,
  } as ReturnType<typeof useMasterBalances>);
  mockUseServices.mockReturnValue({
    ...defaultServicesReturn,
    ...overrides.services,
  } as ReturnType<typeof useServices>);
};

// ---------- tests ----------

describe('useTokensFundingStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('returns isLoading true when refill requirements are loading', () => {
    setupMocks({ refill: { isLoading: true } });
    const { result } = renderHook(() => useTokensFundingStatus());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns isLoading false when refill requirements are not loading', () => {
    setupMocks({ refill: { isLoading: false } });
    const { result } = renderHook(() => useTokensFundingStatus());
    expect(result.current.isLoading).toBe(false);
  });

  it('returns empty tokensFundingStatus when no requirements and no balances', () => {
    setupMocks();
    const { result } = renderHook(() => useTokensFundingStatus());
    expect(result.current.isFullyFunded).toBe(false);
    expect(result.current.tokensFundingStatus).toEqual({});
  });

  it('shows all tokens as pending when wallet has no matching balances', async () => {
    setupMocks({
      refill: { totalTokenRequirements: twoTokenRequirements },
      balances: {
        getMasterEoaBalancesOf: jest
          .fn()
          .mockReturnValue([
            makeWalletBalance('OLAS', 0),
            makeWalletBalance('XDAI', 0),
          ]),
        getMasterSafeBalancesOf: jest.fn().mockReturnValue([]),
      },
    });

    const { result } = renderHook(() => useTokensFundingStatus());

    await waitFor(() => {
      expect(Object.keys(result.current.tokensFundingStatus).length).toBe(2);
    });

    const status = result.current.tokensFundingStatus;
    expect(status['OLAS'].areFundsReceived).toBe(false);
    expect(status['OLAS'].pendingAmount).toBe(100);
    expect(status['OLAS'].totalAmount).toBe(100);
    expect(status['XDAI'].areFundsReceived).toBe(false);
    expect(status['XDAI'].pendingAmount).toBe(11.5);
    expect(status['XDAI'].totalAmount).toBe(11.5);
    expect(result.current.isFullyFunded).toBe(false);
  });

  it('shows token as received when wallet balance >= required amount', async () => {
    setupMocks({
      refill: { totalTokenRequirements: twoTokenRequirements },
      balances: {
        getMasterEoaBalancesOf: jest
          .fn()
          .mockReturnValue([
            makeWalletBalance('OLAS', 200),
            makeWalletBalance('XDAI', 15),
          ]),
        getMasterSafeBalancesOf: jest.fn().mockReturnValue([]),
      },
    });

    const { result } = renderHook(() => useTokensFundingStatus());

    await waitFor(() => {
      expect(result.current.isFullyFunded).toBe(true);
    });

    const status = result.current.tokensFundingStatus;
    expect(status['OLAS'].areFundsReceived).toBe(true);
    expect(status['OLAS'].pendingAmount).toBe(0);
    expect(status['XDAI'].areFundsReceived).toBe(true);
    expect(status['XDAI'].pendingAmount).toBe(0);
  });

  it('calculates correct pending amount when balance < required', async () => {
    setupMocks({
      refill: { totalTokenRequirements: twoTokenRequirements },
      balances: {
        getMasterEoaBalancesOf: jest
          .fn()
          .mockReturnValue([
            makeWalletBalance('OLAS', 30),
            makeWalletBalance('XDAI', 5),
          ]),
        getMasterSafeBalancesOf: jest.fn().mockReturnValue([]),
      },
    });

    const { result } = renderHook(() => useTokensFundingStatus());

    await waitFor(() => {
      expect(Object.keys(result.current.tokensFundingStatus).length).toBe(2);
    });

    const status = result.current.tokensFundingStatus;
    expect(status['OLAS'].areFundsReceived).toBe(false);
    expect(status['OLAS'].pendingAmount).toBe(70); // 100 - 30
    expect(status['XDAI'].areFundsReceived).toBe(false);
    expect(status['XDAI'].pendingAmount).toBe(6.5); // 11.5 - 5
  });

  it('tries master safe balances first, falls back to master EOA', async () => {
    const getMasterSafeBalancesOf = jest
      .fn()
      .mockReturnValue([
        makeWalletBalance('OLAS', 200),
        makeWalletBalance('XDAI', 20),
      ]);
    const getMasterEoaBalancesOf = jest
      .fn()
      .mockReturnValue([
        makeWalletBalance('OLAS', 5),
        makeWalletBalance('XDAI', 1),
      ]);

    setupMocks({
      refill: { totalTokenRequirements: twoTokenRequirements },
      balances: { getMasterSafeBalancesOf, getMasterEoaBalancesOf },
    });

    const { result } = renderHook(() => useTokensFundingStatus());

    await waitFor(() => {
      expect(result.current.isFullyFunded).toBe(true);
    });

    // Safe was used (non-empty), so EOA should not be the source
    expect(getMasterSafeBalancesOf).toHaveBeenCalledWith(GNOSIS_CHAIN_ID);
    // EOA is still called by useMemo (it's in deps), but safe result was used
    const status = result.current.tokensFundingStatus;
    expect(status['OLAS'].areFundsReceived).toBe(true);
    expect(status['OLAS'].pendingAmount).toBe(0);
  });

  it('falls back to EOA when safe returns empty array', async () => {
    const getMasterSafeBalancesOf = jest.fn().mockReturnValue([]);
    const getMasterEoaBalancesOf = jest
      .fn()
      .mockReturnValue([
        makeWalletBalance('OLAS', 200),
        makeWalletBalance('XDAI', 20),
      ]);

    setupMocks({
      refill: { totalTokenRequirements: twoTokenRequirements },
      balances: { getMasterSafeBalancesOf, getMasterEoaBalancesOf },
    });

    const { result } = renderHook(() => useTokensFundingStatus());

    await waitFor(() => {
      expect(result.current.isFullyFunded).toBe(true);
    });

    expect(getMasterEoaBalancesOf).toHaveBeenCalledWith(GNOSIS_CHAIN_ID);
    const status = result.current.tokensFundingStatus;
    expect(status['OLAS'].areFundsReceived).toBe(true);
  });

  it('freezes status once fully funded (balance changes do not affect status)', async () => {
    const getMasterEoaBalancesOf = jest
      .fn()
      .mockReturnValue([
        makeWalletBalance('OLAS', 200),
        makeWalletBalance('XDAI', 20),
      ]);

    setupMocks({
      refill: { totalTokenRequirements: twoTokenRequirements },
      balances: {
        getMasterSafeBalancesOf: jest.fn().mockReturnValue([]),
        getMasterEoaBalancesOf,
      },
    });

    const { result, rerender } = renderHook(() => useTokensFundingStatus());

    // Wait for fully funded state
    await waitFor(() => {
      expect(result.current.isFullyFunded).toBe(true);
    });

    // Now change balances to zero — status should remain frozen
    getMasterEoaBalancesOf.mockReturnValue([
      makeWalletBalance('OLAS', 0),
      makeWalletBalance('XDAI', 0),
    ]);

    act(() => {
      rerender();
    });

    // Should still be fully funded (frozen)
    expect(result.current.isFullyFunded).toBe(true);
    expect(result.current.tokensFundingStatus['OLAS'].areFundsReceived).toBe(
      true,
    );
    expect(result.current.tokensFundingStatus['OLAS'].pendingAmount).toBe(0);
    expect(result.current.tokensFundingStatus['XDAI'].areFundsReceived).toBe(
      true,
    );
    expect(result.current.tokensFundingStatus['XDAI'].pendingAmount).toBe(0);
  });

  it('returns isFullyFunded true when all tokens received', async () => {
    setupMocks({
      refill: { totalTokenRequirements: twoTokenRequirements },
      balances: {
        getMasterEoaBalancesOf: jest
          .fn()
          .mockReturnValue([
            makeWalletBalance('OLAS', 100),
            makeWalletBalance('XDAI', 11.5),
          ]),
        getMasterSafeBalancesOf: jest.fn().mockReturnValue([]),
      },
    });

    const { result } = renderHook(() => useTokensFundingStatus());

    await waitFor(() => {
      expect(result.current.isFullyFunded).toBe(true);
    });

    const allReceived = Object.values(result.current.tokensFundingStatus).every(
      (s) => s.areFundsReceived,
    );
    expect(allReceived).toBe(true);
  });

  it('returns isFullyFunded false when any token not received', async () => {
    setupMocks({
      refill: { totalTokenRequirements: twoTokenRequirements },
      balances: {
        getMasterEoaBalancesOf: jest.fn().mockReturnValue([
          makeWalletBalance('OLAS', 200),
          makeWalletBalance('XDAI', 5), // below 11.5
        ]),
        getMasterSafeBalancesOf: jest.fn().mockReturnValue([]),
      },
    });

    const { result } = renderHook(() => useTokensFundingStatus());

    await waitFor(() => {
      expect(Object.keys(result.current.tokensFundingStatus).length).toBe(2);
    });

    expect(result.current.isFullyFunded).toBe(false);
    expect(result.current.tokensFundingStatus['OLAS'].areFundsReceived).toBe(
      true,
    );
    expect(result.current.tokensFundingStatus['XDAI'].areFundsReceived).toBe(
      false,
    );
  });

  it('captures token requirements snapshot once and does not change when requirements update', async () => {
    const firstRequirements = [olasRequirement];
    const updatedRequirements: TokenRequirement[] = [
      { amount: 999, symbol: 'OLAS', iconSrc: '/tokens/olas-icon.png' },
      xdaiRequirement,
    ];

    setupMocks({
      refill: { totalTokenRequirements: firstRequirements },
      balances: {
        getMasterEoaBalancesOf: jest
          .fn()
          .mockReturnValue([makeWalletBalance('OLAS', 50)]),
        getMasterSafeBalancesOf: jest.fn().mockReturnValue([]),
      },
    });

    const { result, rerender } = renderHook(() => useTokensFundingStatus());

    // Wait for initial requirements to be captured
    await waitFor(() => {
      expect(Object.keys(result.current.tokensFundingStatus).length).toBe(1);
    });

    expect(result.current.tokensFundingStatus['OLAS'].totalAmount).toBe(100);

    // Update requirements to a different amount
    mockUseGetRefillRequirements.mockReturnValue({
      ...defaultRefillReturn,
      totalTokenRequirements: updatedRequirements,
    } as ReturnType<typeof useGetRefillRequirements>);

    act(() => {
      rerender();
    });

    // Snapshot should still use the original amount (100), not 999
    expect(result.current.tokensFundingStatus['OLAS'].totalAmount).toBe(100);
    // Should NOT have XDAI since it wasn't in the initial snapshot
    expect(result.current.tokensFundingStatus['XDAI']).toBeUndefined();
  });

  it('returns empty walletBalances when isLoaded is false', () => {
    setupMocks({
      refill: { totalTokenRequirements: twoTokenRequirements },
      balances: {
        isLoaded: false,
        getMasterEoaBalancesOf: jest
          .fn()
          .mockReturnValue([makeWalletBalance('OLAS', 200)]),
        getMasterSafeBalancesOf: jest.fn().mockReturnValue([]),
      },
    });

    const { result } = renderHook(() => useTokensFundingStatus());

    // When not loaded, walletBalances is empty so fundingStatus falls through
    // to the isEmpty check and returns empty
    expect(result.current.isFullyFunded).toBe(false);
    expect(result.current.tokensFundingStatus).toEqual({});
  });

  it('preserves frozen status icon and symbol data', async () => {
    setupMocks({
      refill: { totalTokenRequirements: [olasRequirement] },
      balances: {
        getMasterEoaBalancesOf: jest
          .fn()
          .mockReturnValue([makeWalletBalance('OLAS', 200)]),
        getMasterSafeBalancesOf: jest.fn().mockReturnValue([]),
      },
    });

    const { result } = renderHook(() => useTokensFundingStatus());

    await waitFor(() => {
      expect(result.current.isFullyFunded).toBe(true);
    });

    const olasStatus = result.current.tokensFundingStatus['OLAS'];
    expect(olasStatus.symbol).toBe('OLAS');
    expect(olasStatus.iconSrc).toBe('/tokens/olas-icon.png');
    expect(olasStatus.totalAmount).toBe(100);
    expect(olasStatus.pendingAmount).toBe(0);
    expect(olasStatus.areFundsReceived).toBe(true);
  });
});
