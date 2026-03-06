import { renderHook } from '@testing-library/react';

jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));
jest.mock('../../hooks/useMultisig', () => ({
  useMultisigs: jest.fn(),
}));
jest.mock('../../hooks/useBalanceContext', () => ({
  useBalanceContext: jest.fn(),
}));
jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));
jest.mock('../../hooks/useStore', () => ({
  useStore: jest.fn(),
}));

import { useMasterWalletContext } from '../../hooks/useWallet';
import { useMultisigs } from '../../hooks/useMultisig';
import { useBalanceContext } from '../../hooks/useBalanceContext';
import { useServices } from '../../hooks/useServices';
import { useStore } from '../../hooks/useStore';
import { useLogs } from '../../hooks/useLogs';

const mockUseMasterWalletContext = useMasterWalletContext as jest.Mock;
const mockUseMultisigs = useMultisigs as jest.Mock;
const mockUseBalanceContext = useBalanceContext as jest.Mock;
const mockUseServices = useServices as jest.Mock;
const mockUseStore = useStore as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  mockUseMasterWalletContext.mockReturnValue({
    masterEoa: null,
    masterSafes: [],
    masterWallets: [],
    isFetched: false,
  });
  mockUseMultisigs.mockReturnValue({
    masterSafesOwners: null,
    masterSafesOwnersIsFetched: false,
  });
  mockUseBalanceContext.mockReturnValue({
    isLoaded: false,
    totalEthBalance: 0n,
    totalOlasBalance: 0n,
    walletBalances: [],
    totalStakedOlasBalance: 0n,
  });
  mockUseServices.mockReturnValue({
    services: null,
    isFetched: false,
    selectedService: null,
  });
  mockUseStore.mockReturnValue({ storeState: undefined });
});

describe('useLogs', () => {
  it('returns null debug data when dependencies are not loaded', () => {
    const { result } = renderHook(() => useLogs());

    expect(result.current.store).toBeUndefined();
    expect(result.current.debugData.services).toBeNull();
    expect(result.current.debugData.addresses).toBeNull();
    expect(result.current.debugData.balances).toBeNull();
  });

  it('returns services data when services are loaded', () => {
    mockUseServices.mockReturnValue({
      services: [
        {
          service_config_id: 'sc-1',
          keys: [{ address: '0xabc' }],
          deploymentStatus: 'DEPLOYED',
        },
      ],
      isFetched: true,
      selectedService: null,
    });

    const { result } = renderHook(() => useLogs());
    expect(result.current.debugData.services).toEqual({
      services: [
        {
          service_config_id: 'sc-1',
          keys: ['0xabc'],
          deploymentStatus: 'DEPLOYED',
        },
      ],
    });
  });

  it('uses selectedService deploymentStatus when it matches', () => {
    const selectedService = {
      service_config_id: 'sc-1',
      deploymentStatus: 'STOPPED',
    };
    mockUseServices.mockReturnValue({
      services: [
        {
          service_config_id: 'sc-1',
          keys: [],
          deploymentStatus: 'DEPLOYED',
        },
      ],
      isFetched: true,
      selectedService,
    });

    const { result } = renderHook(() => useLogs());
    const services = result.current.debugData.services as {
      services: { deploymentStatus: string }[];
    };
    expect(services.services[0].deploymentStatus).toBe('STOPPED');
  });

  it('returns addresses data when wallet and multisig are loaded', () => {
    const masterEoa = { address: '0x1234' };
    const masterSafes = [{ address: '0xSafe' }];
    mockUseMasterWalletContext.mockReturnValue({
      masterEoa,
      masterSafes,
      masterWallets: [],
      isFetched: true,
    });
    mockUseMultisigs.mockReturnValue({
      masterSafesOwners: [],
      masterSafesOwnersIsFetched: true,
    });

    const { result } = renderHook(() => useLogs());
    expect(result.current.debugData.addresses).toEqual([
      { masterEoa },
      { masterSafe: masterSafes },
      { masterSafeBackups: [] },
    ]);
  });

  it('returns balances data when balances are loaded', () => {
    mockUseBalanceContext.mockReturnValue({
      isLoaded: true,
      totalEthBalance: 100n,
      totalOlasBalance: 200n,
      walletBalances: [{ balance: 100n }],
      totalStakedOlasBalance: 50n,
    });
    mockUseMasterWalletContext.mockReturnValue({
      masterEoa: null,
      masterSafes: [],
      masterWallets: [{ address: '0x1' }],
      isFetched: false,
    });

    const { result } = renderHook(() => useLogs());
    expect(result.current.debugData.balances).toEqual([
      { masterWallets: [{ address: '0x1' }] },
      { walletBalances: [{ balance: 100n }] },
      { totalOlasStakedBalance: 50n },
      { totalEthBalance: 100n },
      { totalOlasBalance: 200n },
    ]);
  });

  it('includes store state', () => {
    mockUseStore.mockReturnValue({
      storeState: { environmentName: 'production' },
    });

    const { result } = renderHook(() => useLogs());
    expect(result.current.store).toEqual({ environmentName: 'production' });
  });

  it('filters backup EOAs from multisig owners excluding masterEoa', () => {
    const masterEoa = { address: '0xMasterEoa' };
    mockUseMasterWalletContext.mockReturnValue({
      masterEoa,
      masterSafes: [],
      masterWallets: [],
      isFetched: true,
    });
    mockUseMultisigs.mockReturnValue({
      masterSafesOwners: [
        {
          owners: ['0xMasterEoa', '0xBackup1'],
          safeAddress: '0xSafe1',
          evmChainId: 8453,
        },
      ],
      masterSafesOwnersIsFetched: true,
    });

    const { result } = renderHook(() => useLogs());
    const addresses = result.current.debugData.addresses as {
      masterSafeBackups: unknown;
    }[];
    const backups = addresses[2].masterSafeBackups as {
      address: string;
      evmChainId: number;
    }[];
    expect(backups).toHaveLength(1);
    expect(backups[0].address).toBe('0xBackup1');
    expect(backups[0].evmChainId).toBe(8453);
  });
});
