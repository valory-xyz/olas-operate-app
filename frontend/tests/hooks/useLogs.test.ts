import { renderHook } from '@testing-library/react';

import { EvmChainIdMap } from '../../constants/chains';
import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import { WALLET_TYPE } from '../../constants/wallet';
import { useBalanceContext } from '../../hooks/useBalanceContext';
import { useLogs } from '../../hooks/useLogs';
import { useMultisigs } from '../../hooks/useMultisig';
import { useServices } from '../../hooks/useServices';
import { useStore } from '../../hooks/useStore';
import { useMasterWalletContext } from '../../hooks/useWallet';
import {
  AGENT_KEY_ADDRESS,
  BACKUP_SIGNER_ADDRESS,
  BACKUP_SIGNER_ADDRESS_2,
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  makeMasterEoa,
  makeMasterSafe,
  makeMultisigOwners,
  makeService,
} from '../helpers/factories';

jest.mock('../../hooks/useStore', () => ({ useStore: jest.fn() }));
jest.mock('../../hooks/useServices', () => ({ useServices: jest.fn() }));
jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));
jest.mock('../../hooks/useMultisig', () => ({ useMultisigs: jest.fn() }));
jest.mock('../../hooks/useBalanceContext', () => ({
  useBalanceContext: jest.fn(),
}));

const mockUseStore = useStore as jest.Mock;
const mockUseServices = useServices as jest.Mock;
const mockUseMasterWalletContext = useMasterWalletContext as jest.Mock;
const mockUseMultisigs = useMultisigs as jest.Mock;
const mockUseBalanceContext = useBalanceContext as jest.Mock;

const mockMasterEoa = makeMasterEoa();
const mockMasterSafe = makeMasterSafe(EvmChainIdMap.Gnosis);
const mockService = makeService();

const DEFAULTS = {
  storeState: { lastSelectedAgentType: 'trader' },
  services: [mockService] as unknown[],
  selectedService: mockService as unknown,
  isFetched: true,
  masterEoa: mockMasterEoa as unknown,
  masterSafes: [mockMasterSafe] as unknown,
  masterWallets: [mockMasterEoa, mockMasterSafe] as unknown,
  masterWalletsIsFetched: true,
  masterSafesOwners: [
    makeMultisigOwners(EvmChainIdMap.Gnosis, [
      DEFAULT_EOA_ADDRESS,
      BACKUP_SIGNER_ADDRESS,
    ]),
  ] as unknown,
  masterSafesOwnersIsFetched: true,
  isBalanceLoaded: true,
  totalEthBalance: 1.5 as unknown,
  totalOlasBalance: 100 as unknown,
  totalStakedOlasBalance: 50 as unknown,
  walletBalances: [{ address: DEFAULT_EOA_ADDRESS, balance: '1.5' }] as unknown,
};

const createDefaultMocks = (overrides: Partial<typeof DEFAULTS> = {}) => {
  const opts = { ...DEFAULTS, ...overrides };
  mockUseStore.mockReturnValue({ storeState: opts.storeState });
  mockUseServices.mockReturnValue({
    services: opts.services,
    isFetched: opts.isFetched,
    selectedService: opts.selectedService,
    selectedAgentType: 'trader',
  });
  mockUseMasterWalletContext.mockReturnValue({
    masterEoa: opts.masterEoa,
    masterSafes: opts.masterSafes,
    masterWallets: opts.masterWallets,
    isFetched: opts.masterWalletsIsFetched,
  });
  mockUseMultisigs.mockReturnValue({
    masterSafesOwners: opts.masterSafesOwners,
    masterSafesOwnersIsFetched: opts.masterSafesOwnersIsFetched,
  });
  mockUseBalanceContext.mockReturnValue({
    isLoaded: opts.isBalanceLoaded,
    totalEthBalance: opts.totalEthBalance,
    totalOlasBalance: opts.totalOlasBalance,
    totalStakedOlasBalance: opts.totalStakedOlasBalance,
    walletBalances: opts.walletBalances,
    getStakedOlasBalanceByServiceId: jest.fn(() => 0),
  });
};

describe('useLogs', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns store state in logs.store', () => {
    const storeState = { lastSelectedAgentType: 'trader' };
    createDefaultMocks({ storeState });
    const { result } = renderHook(() => useLogs());
    expect(result.current.store).toBe(storeState);
  });

  describe('when data is not loaded', () => {
    it('returns null for services when isFetched is false', () => {
      createDefaultMocks({ isFetched: false });
      const { result } = renderHook(() => useLogs());
      expect(result.current.debugData.services).toBeNull();
    });

    it('returns null for addresses when wallet is not fetched', () => {
      createDefaultMocks({ masterWalletsIsFetched: false });
      const { result } = renderHook(() => useLogs());
      expect(result.current.debugData.addresses).toBeNull();
    });

    it('returns null for addresses when multisig owners not fetched', () => {
      createDefaultMocks({ masterSafesOwnersIsFetched: false });
      const { result } = renderHook(() => useLogs());
      expect(result.current.debugData.addresses).toBeNull();
    });

    it('returns null for balances when balance is not loaded', () => {
      createDefaultMocks({ isBalanceLoaded: false });
      const { result } = renderHook(() => useLogs());
      expect(result.current.debugData.balances).toBeNull();
    });
  });

  describe('when all data is loaded', () => {
    it('returns formatted services data', () => {
      createDefaultMocks();
      const { result } = renderHook(() => useLogs());
      const servicesData = result.current.debugData
        .services as unknown as Record<string, unknown[]>;
      expect(servicesData).not.toBeNull();
      expect(servicesData.services).toBeDefined();
      expect(servicesData.services).toHaveLength(1);
      const firstService = servicesData.services[0] as Record<string, unknown>;
      expect(firstService.keys).toEqual([AGENT_KEY_ADDRESS]);
    });

    it('returns address data with masterEoa, masterSafe, and backupEoas', () => {
      createDefaultMocks();
      const { result } = renderHook(() => useLogs());
      const addressData = result.current.debugData.addresses;
      expect(addressData).not.toBeNull();
      expect(addressData).toEqual([
        { masterEoa: mockMasterEoa },
        { masterSafe: [mockMasterSafe] },
        {
          masterSafeBackups: [
            {
              address: BACKUP_SIGNER_ADDRESS,
              type: WALLET_TYPE.EOA,
              safeAddress: DEFAULT_SAFE_ADDRESS,
              evmChainId: EvmChainIdMap.Gnosis,
            },
          ],
        },
      ]);
    });

    it('returns balance data', () => {
      createDefaultMocks();
      const { result } = renderHook(() => useLogs());
      const balanceData = result.current.debugData.balances;
      expect(balanceData).not.toBeNull();
      expect(balanceData).toEqual([
        { masterWallets: [mockMasterEoa, mockMasterSafe] },
        {
          walletBalances: [{ address: DEFAULT_EOA_ADDRESS, balance: '1.5' }],
        },
        { totalOlasStakedBalance: 50 },
        { totalEthBalance: 1.5 },
        { totalOlasBalance: 100 },
      ]);
    });
  });

  describe('useAddressesLogs (backupEoas filtering)', () => {
    it('filters out masterEoa address from multisig owners to get backupEoas', () => {
      createDefaultMocks({
        masterSafesOwners: [
          makeMultisigOwners(EvmChainIdMap.Gnosis, [
            DEFAULT_EOA_ADDRESS,
            BACKUP_SIGNER_ADDRESS,
            BACKUP_SIGNER_ADDRESS_2,
          ]),
        ],
      });
      const { result } = renderHook(() => useLogs());
      const addressData = result.current.debugData.addresses;
      expect(addressData).not.toBeNull();
      const backupEntry = addressData![2];
      expect(backupEntry.masterSafeBackups).toEqual([
        {
          address: BACKUP_SIGNER_ADDRESS,
          type: WALLET_TYPE.EOA,
          safeAddress: DEFAULT_SAFE_ADDRESS,
          evmChainId: EvmChainIdMap.Gnosis,
        },
        {
          address: BACKUP_SIGNER_ADDRESS_2,
          type: WALLET_TYPE.EOA,
          safeAddress: DEFAULT_SAFE_ADDRESS,
          evmChainId: EvmChainIdMap.Gnosis,
        },
      ]);
    });

    it('returns "undefined" string for backupEoas when masterEoa is undefined', () => {
      createDefaultMocks({ masterEoa: undefined });
      const { result } = renderHook(() => useLogs());
      const addressData = result.current.debugData.addresses;
      expect(addressData).not.toBeNull();
      expect(addressData![0]).toEqual({ masterEoa: 'undefined' });
      expect(addressData![2]).toEqual({ masterSafeBackups: 'undefined' });
    });

    it('returns "undefined" string for backupEoas when masterSafesOwners is undefined', () => {
      createDefaultMocks({ masterSafesOwners: undefined });
      const { result } = renderHook(() => useLogs());
      const addressData = result.current.debugData.addresses;
      expect(addressData).not.toBeNull();
      expect(addressData![2]).toEqual({ masterSafeBackups: 'undefined' });
    });

    it('returns "undefined" string for masterSafe when masterSafes is undefined', () => {
      createDefaultMocks({ masterSafes: undefined });
      const { result } = renderHook(() => useLogs());
      const addressData = result.current.debugData.addresses;
      expect(addressData).not.toBeNull();
      expect(addressData![1]).toEqual({ masterSafe: 'undefined' });
    });
  });

  describe('useServicesLogs (service formatting)', () => {
    it('uses selectedService deploymentStatus for the matching service', () => {
      const selectedService = makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.STOPPED,
      });
      const serviceInList = makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
      });
      createDefaultMocks({ services: [serviceInList], selectedService });
      const { result } = renderHook(() => useLogs());
      const servicesData = result.current.debugData
        .services as unknown as Record<string, Record<string, unknown>[]>;
      expect(servicesData.services[0].deploymentStatus).toBe(
        MiddlewareDeploymentStatusMap.STOPPED,
      );
    });

    it('uses own deploymentStatus for non-matching services', () => {
      const selectedService = makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.STOPPED,
      });
      const otherService = makeService({
        service_config_id: 'sc-bb112233-cc44-dd55-ee66-ff7788990011',
        name: 'Other Agent',
        deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
      });
      createDefaultMocks({
        services: [mockService, otherService],
        selectedService,
      });
      const { result } = renderHook(() => useLogs());
      const servicesData = result.current.debugData
        .services as unknown as Record<string, Record<string, unknown>[]>;
      expect(servicesData.services[0].deploymentStatus).toBe(
        MiddlewareDeploymentStatusMap.STOPPED,
      );
      expect(servicesData.services[1].deploymentStatus).toBe(
        MiddlewareDeploymentStatusMap.DEPLOYED,
      );
    });

    it('returns "undefined" string when services is undefined', () => {
      createDefaultMocks({ services: undefined, selectedService: undefined });
      const { result } = renderHook(() => useLogs());
      const servicesData = result.current.debugData.services;
      expect(servicesData!.services).toBe('undefined');
    });
  });

  describe('useBalancesLogs', () => {
    it('uses "undefined" string fallback when balance data is missing', () => {
      createDefaultMocks({
        totalEthBalance: undefined,
        totalOlasBalance: undefined,
        totalStakedOlasBalance: undefined,
        walletBalances: undefined,
        masterWallets: undefined,
      });
      const { result } = renderHook(() => useLogs());
      const balanceData = result.current.debugData.balances;
      expect(balanceData).not.toBeNull();
      expect(balanceData).toEqual([
        { masterWallets: 'undefined' },
        { walletBalances: 'undefined' },
        { totalOlasStakedBalance: 'undefined' },
        { totalEthBalance: 'undefined' },
        { totalOlasBalance: 'undefined' },
      ]);
    });
  });
});
