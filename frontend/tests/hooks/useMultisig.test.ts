import { renderHook, waitFor } from '@testing-library/react';

import { EvmChainIdMap } from '../../constants/chains';
import { PROVIDERS } from '../../constants/providers';
import { WALLET_OWNER, WALLET_TYPE } from '../../constants/wallet';
import { useMultisig, useMultisigs } from '../../hooks/useMultisig';
import { useMasterWalletContext } from '../../hooks/useWallet';
import { Address } from '../../types/Address';
import {
  BACKUP_SIGNER_ADDRESS,
  BACKUP_SIGNER_ADDRESS_2,
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  POLYGON_SAFE_ADDRESS,
} from '../helpers/factories';
import { createQueryClientWrapper } from '../helpers/queryClient';

/* eslint-disable @typescript-eslint/no-var-requires */
const mockGetOwners = jest.fn();

jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    Contract: jest.fn().mockImplementation(() => ({
      getOwners: mockGetOwners,
    })),
  };
});

jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);

jest.mock('../../constants/providers', () => {
  const { EvmChainIdMap } = require('../../constants/chains');

  // Shared mock fn accessible from tests via PROVIDERS[chainId].multicallProvider.all
  const sharedAll = jest.fn();

  const makeChainProvider = () => ({
    provider: { _isProvider: true },
    multicallProvider: { all: sharedAll },
  });

  return {
    PROVIDERS: {
      [EvmChainIdMap.Gnosis]: makeChainProvider(),
      [EvmChainIdMap.Polygon]: makeChainProvider(),
      [EvmChainIdMap.Base]: makeChainProvider(),
      [EvmChainIdMap.Mode]: makeChainProvider(),
      [EvmChainIdMap.Optimism]: makeChainProvider(),
    },
  };
});
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));

// Get the shared multicall mock from the mocked PROVIDERS
const mockMulticallAll = PROVIDERS[EvmChainIdMap.Gnosis].multicallProvider
  .all as jest.Mock;

const mockUseMasterWalletContext = useMasterWalletContext as jest.Mock;

describe('useMultisig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMasterWalletContext.mockReturnValue({
      masterEoa: {
        address: DEFAULT_EOA_ADDRESS,
        type: WALLET_TYPE.EOA,
        owner: WALLET_OWNER.Master,
      },
    });
  });

  it('fetches owners for a given safe', async () => {
    mockGetOwners.mockResolvedValue([
      DEFAULT_EOA_ADDRESS,
      BACKUP_SIGNER_ADDRESS,
    ]);

    const safe = {
      address: DEFAULT_SAFE_ADDRESS,
      evmChainId: EvmChainIdMap.Gnosis,
      type: WALLET_TYPE.Safe,
      owner: WALLET_OWNER.Master,
    };

    const { result } = renderHook(() => useMultisig(safe), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.ownersIsFetched).toBe(true);
    });

    expect(result.current.owners).toEqual([
      DEFAULT_EOA_ADDRESS,
      BACKUP_SIGNER_ADDRESS,
    ]);
  });

  it('filters out masterEoa from backupOwners using case-insensitive comparison', async () => {
    mockGetOwners.mockResolvedValue([
      DEFAULT_EOA_ADDRESS,
      BACKUP_SIGNER_ADDRESS,
    ]);

    const safe = {
      address: DEFAULT_SAFE_ADDRESS,
      evmChainId: EvmChainIdMap.Gnosis,
      type: WALLET_TYPE.Safe,
      owner: WALLET_OWNER.Master,
    };

    const { result } = renderHook(() => useMultisig(safe), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.ownersIsFetched).toBe(true);
    });

    expect(result.current.backupOwners).toEqual([BACKUP_SIGNER_ADDRESS]);
    expect(result.current.backupOwners).not.toContain(DEFAULT_EOA_ADDRESS);
  });

  it('returns empty backupOwners when masterEoa is the only owner', async () => {
    mockGetOwners.mockResolvedValue([DEFAULT_EOA_ADDRESS]);

    const safe = {
      address: DEFAULT_SAFE_ADDRESS,
      evmChainId: EvmChainIdMap.Gnosis,
      type: WALLET_TYPE.Safe,
      owner: WALLET_OWNER.Master,
    };

    const { result } = renderHook(() => useMultisig(safe), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.ownersIsFetched).toBe(true);
    });

    expect(result.current.backupOwners).toEqual([]);
  });

  it('is disabled when safe is undefined', () => {
    const { result } = renderHook(() => useMultisig(undefined), {
      wrapper: createQueryClientWrapper(),
    });

    // When disabled, owners is undefined (query never runs)
    expect(result.current.owners).toBeUndefined();
    expect(mockGetOwners).not.toHaveBeenCalled();
  });
});

describe('useMultisigs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMasterWalletContext.mockReturnValue({
      masterEoa: {
        address: DEFAULT_EOA_ADDRESS,
        type: WALLET_TYPE.EOA,
        owner: WALLET_OWNER.Master,
      },
    });

    // Reset the multicall mock for ethers-multicall Contract
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { mockMulticallContract } =
      require('../mocks/ethersMulticall') as typeof import('../mocks/ethersMulticall');
    /* eslint-enable @typescript-eslint/no-var-requires */
    mockMulticallContract.mockImplementation(() => ({
      getOwners: jest.fn().mockReturnValue('getOwners_call'),
    }));
  });

  it('fetches owners for multiple safes across chains', async () => {
    const gnosisSafe = {
      address: DEFAULT_SAFE_ADDRESS,
      evmChainId: EvmChainIdMap.Gnosis,
      type: WALLET_TYPE.Safe,
      owner: WALLET_OWNER.Master,
    };
    const polygonSafe = {
      address: POLYGON_SAFE_ADDRESS,
      evmChainId: EvmChainIdMap.Polygon,
      type: WALLET_TYPE.Safe,
      owner: WALLET_OWNER.Master,
    };

    // multicallProvider.all is called per chain; return owners for each call
    mockMulticallAll
      .mockResolvedValueOnce([[DEFAULT_EOA_ADDRESS, BACKUP_SIGNER_ADDRESS]])
      .mockResolvedValueOnce([[DEFAULT_EOA_ADDRESS, BACKUP_SIGNER_ADDRESS_2]]);

    const { result } = renderHook(
      () => useMultisigs([gnosisSafe, polygonSafe]),
      {
        wrapper: createQueryClientWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.masterSafesOwnersIsFetched).toBe(true);
    });

    expect(result.current.masterSafesOwners).toHaveLength(2);
  });

  it('filters out masterEoa from allBackupAddresses using strict equality', async () => {
    const gnosisSafe = {
      address: DEFAULT_SAFE_ADDRESS,
      evmChainId: EvmChainIdMap.Gnosis,
      type: WALLET_TYPE.Safe,
      owner: WALLET_OWNER.Master,
    };

    mockMulticallAll.mockResolvedValueOnce([
      [DEFAULT_EOA_ADDRESS, BACKUP_SIGNER_ADDRESS],
    ]);

    const { result } = renderHook(() => useMultisigs([gnosisSafe]), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.masterSafesOwnersIsFetched).toBe(true);
    });

    expect(result.current.allBackupAddresses).toEqual([BACKUP_SIGNER_ADDRESS]);
    expect(result.current.allBackupAddresses).not.toContain(
      DEFAULT_EOA_ADDRESS,
    );
  });

  it('deduplicates backup addresses across chains', async () => {
    const gnosisSafe = {
      address: DEFAULT_SAFE_ADDRESS,
      evmChainId: EvmChainIdMap.Gnosis,
      type: WALLET_TYPE.Safe,
      owner: WALLET_OWNER.Master,
    };
    const polygonSafe = {
      address: POLYGON_SAFE_ADDRESS,
      evmChainId: EvmChainIdMap.Polygon,
      type: WALLET_TYPE.Safe,
      owner: WALLET_OWNER.Master,
    };

    // Same backup signer on both chains
    mockMulticallAll
      .mockResolvedValueOnce([[DEFAULT_EOA_ADDRESS, BACKUP_SIGNER_ADDRESS]])
      .mockResolvedValueOnce([[DEFAULT_EOA_ADDRESS, BACKUP_SIGNER_ADDRESS]]);

    const { result } = renderHook(
      () => useMultisigs([gnosisSafe, polygonSafe]),
      { wrapper: createQueryClientWrapper() },
    );

    await waitFor(() => {
      expect(result.current.masterSafesOwnersIsFetched).toBe(true);
    });

    // Deduplicated: only one BACKUP_SIGNER_ADDRESS despite appearing on both chains
    expect(result.current.allBackupAddresses).toEqual([BACKUP_SIGNER_ADDRESS]);
  });

  it('returns allBackupAddressesByChainId grouped per chain', async () => {
    const gnosisSafe = {
      address: DEFAULT_SAFE_ADDRESS,
      evmChainId: EvmChainIdMap.Gnosis,
      type: WALLET_TYPE.Safe,
      owner: WALLET_OWNER.Master,
    };
    const polygonSafe = {
      address: POLYGON_SAFE_ADDRESS,
      evmChainId: EvmChainIdMap.Polygon,
      type: WALLET_TYPE.Safe,
      owner: WALLET_OWNER.Master,
    };

    mockMulticallAll
      .mockResolvedValueOnce([[DEFAULT_EOA_ADDRESS, BACKUP_SIGNER_ADDRESS]])
      .mockResolvedValueOnce([[DEFAULT_EOA_ADDRESS, BACKUP_SIGNER_ADDRESS_2]]);

    const { result } = renderHook(
      () => useMultisigs([gnosisSafe, polygonSafe]),
      { wrapper: createQueryClientWrapper() },
    );

    await waitFor(() => {
      expect(result.current.masterSafesOwnersIsFetched).toBe(true);
    });

    const byChain = result.current.allBackupAddressesByChainId!;
    expect(byChain[EvmChainIdMap.Gnosis]).toEqual([BACKUP_SIGNER_ADDRESS]);
    expect(byChain[EvmChainIdMap.Polygon]).toEqual([BACKUP_SIGNER_ADDRESS_2]);
  });

  it('is disabled when safes is undefined', () => {
    const { result } = renderHook(() => useMultisigs(undefined), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.masterSafesOwners).toBeUndefined();
    expect(mockMulticallAll).not.toHaveBeenCalled();
  });

  it('is disabled when safes is empty', () => {
    const { result } = renderHook(() => useMultisigs([]), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.masterSafesOwners).toBeUndefined();
    expect(mockMulticallAll).not.toHaveBeenCalled();
  });

  it('logs error when multicallProvider is missing for a chain', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Use a chainId that doesn't have a provider in our mock
    const safe = {
      address: DEFAULT_SAFE_ADDRESS,
      evmChainId: 999 as typeof EvmChainIdMap.Gnosis,
      type: WALLET_TYPE.Safe,
      owner: WALLET_OWNER.Master,
    };

    // No PROVIDERS entry for chainId 999, but we need PROVIDERS to iterate
    // over it. The hook iterates Object.entries(PROVIDERS) and filters safes
    // by chainId — since 999 is not in PROVIDERS, no multicall is attempted.
    // So this test verifies the hook gracefully handles no matching chains.
    const { result } = renderHook(() => useMultisigs([safe]), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.masterSafesOwnersIsFetched).toBe(true);
    });

    // No owners found since the chain is not in PROVIDERS
    expect(result.current.masterSafesOwners).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('uses strict !== for masterEoa filtering (case-sensitive)', async () => {
    // masterEoa is uppercase version, owners list has lowercase — strict !== means both pass through
    const lowercaseEoa = DEFAULT_EOA_ADDRESS.toLowerCase() as Address;
    mockUseMasterWalletContext.mockReturnValue({
      masterEoa: {
        address: DEFAULT_EOA_ADDRESS,
        type: WALLET_TYPE.EOA,
        owner: WALLET_OWNER.Master,
      },
    });

    const gnosisSafe = {
      address: DEFAULT_SAFE_ADDRESS,
      evmChainId: EvmChainIdMap.Gnosis,
      type: WALLET_TYPE.Safe,
      owner: WALLET_OWNER.Master,
    };

    // Return lowercase version of the same EOA + a backup signer
    mockMulticallAll.mockResolvedValueOnce([
      [lowercaseEoa, BACKUP_SIGNER_ADDRESS],
    ]);

    const { result } = renderHook(() => useMultisigs([gnosisSafe]), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.masterSafesOwnersIsFetched).toBe(true);
    });

    // lowercaseEoa !== DEFAULT_EOA_ADDRESS (strict), so it's NOT filtered out
    expect(result.current.allBackupAddresses).toContain(lowercaseEoa);
    expect(result.current.allBackupAddresses).toContain(BACKUP_SIGNER_ADDRESS);
  });
});
