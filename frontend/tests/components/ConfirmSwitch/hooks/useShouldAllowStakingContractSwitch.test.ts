import { renderHook } from '@testing-library/react';

import { useShouldAllowStakingContractSwitch } from '../../../../components/ConfirmSwitch/hooks/useShouldAllowStakingContractSwitch';
import {
  EvmChainIdMap,
  MiddlewareChainMap,
} from '../../../../constants/chains';
import { useBalanceContext } from '../../../../hooks/useBalanceContext';
import { useMasterBalances } from '../../../../hooks/useMasterBalances';
import { useServices } from '../../../../hooks/useServices';
import { useStakingProgram } from '../../../../hooks/useStakingProgram';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  makeChainConfig,
  makeService,
  MOCK_SERVICE_CONFIG_ID_3,
} from '../../../helpers/factories';

const MOCK_STAKING_PROGRAM_ID = 'mock_staking_program';

jest.mock('../../../../hooks/useBalanceContext', () => ({
  useBalanceContext: jest.fn(),
}));
jest.mock('../../../../hooks/useMasterBalances', () => ({
  useMasterBalances: jest.fn(),
}));
jest.mock('../../../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));
jest.mock('../../../../hooks/useStakingProgram', () => ({
  useStakingProgram: jest.fn(),
}));
jest.mock('../../../../config/stakingPrograms', () => ({
  STAKING_PROGRAMS: {
    // EvmChainIdMap.Gnosis = 100
    [100]: {
      // MOCK_STAKING_PROGRAM_ID
      mock_staking_program: {
        // MIN_OLAS_REQUIRED
        stakingRequirements: { OLAS: 100 },
      },
    },
  },
}));

const mockUseBalanceContext = useBalanceContext as jest.MockedFunction<
  typeof useBalanceContext
>;
const mockUseMasterBalances = useMasterBalances as jest.MockedFunction<
  typeof useMasterBalances
>;
const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;
const mockUseStakingProgram = useStakingProgram as jest.MockedFunction<
  typeof useStakingProgram
>;

type MockOverrides = {
  isBalanceLoaded?: boolean;
  stakedOlasBalance?: number | undefined;
  safeOlasBalanceStr?: string | undefined;
  stakingProgramIdToMigrateTo?: string;
  isFetched?: boolean;
  selectedService?: ReturnType<typeof makeService> | undefined;
  serviceToken?: number;
};

const setupMocks = ({
  isBalanceLoaded = true,
  stakedOlasBalance = 0,
  safeOlasBalanceStr = '0',
  stakingProgramIdToMigrateTo = MOCK_STAKING_PROGRAM_ID,
  isFetched = true,
  selectedService,
  serviceToken,
}: MockOverrides = {}) => {
  mockUseBalanceContext.mockReturnValue({
    isLoaded: isBalanceLoaded,
    getStakedOlasBalanceByServiceConfigId: jest.fn(
      () => stakedOlasBalance ?? 0,
    ),
  } as unknown as ReturnType<typeof useBalanceContext>);

  const getMasterSafeOlasBalanceOfInStr = jest.fn(() => safeOlasBalanceStr);
  mockUseMasterBalances.mockReturnValue({
    getMasterSafeOlasBalanceOfInStr,
  } as unknown as ReturnType<typeof useMasterBalances>);

  mockUseStakingProgram.mockReturnValue({
    stakingProgramIdToMigrateTo,
  } as ReturnType<typeof useStakingProgram>);

  // Build selectedService with the appropriate chain_configs
  const service =
    selectedService !== undefined
      ? selectedService
      : makeService({
          chain_configs: makeChainConfig(MiddlewareChainMap.GNOSIS, {
            token: serviceToken ?? DEFAULT_SERVICE_NFT_TOKEN_ID,
          }),
        });

  mockUseServices.mockReturnValue({
    selectedAgentConfig: {
      evmHomeChainId: EvmChainIdMap.Gnosis,
    },
    selectedService: service,
    isFetched,
  } as unknown as ReturnType<typeof useServices>);
};

describe('useShouldAllowStakingContractSwitch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('safeOlasBalance', () => {
    it('returns 0 when balance is not loaded', () => {
      setupMocks({ isBalanceLoaded: false, safeOlasBalanceStr: '50' });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      // When balance is not loaded, safeOlasBalance is 0, so totalOlas is just staked
      expect(result.current.totalOlas).toBe(0);
    });

    it('returns parsed balance when balance is loaded', () => {
      setupMocks({ safeOlasBalanceStr: '42', stakedOlasBalance: 0 });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      expect(result.current.totalOlas).toBe(42);
    });

    it('returns 0 when getMasterSafeOlasBalanceOfInStr returns empty string', () => {
      setupMocks({
        safeOlasBalanceStr: '',
        stakedOlasBalance: 0,
      });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      expect(result.current.totalOlas).toBe(0);
    });

    it('returns 0 when getMasterSafeOlasBalanceOfInStr returns undefined', () => {
      setupMocks({
        safeOlasBalanceStr: undefined,
        stakedOlasBalance: 0,
      });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      expect(result.current.totalOlas).toBe(0);
    });
  });

  describe('totalOlas', () => {
    it('sums safeOlasBalance and staked service balance', () => {
      setupMocks({ safeOlasBalanceStr: '30', stakedOlasBalance: 70 });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      expect(result.current.totalOlas).toBe(100);
    });

    it('uses only safeOlasBalance when service has no staked OLAS', () => {
      setupMocks({
        safeOlasBalanceStr: '50',
        stakedOlasBalance: undefined,
      });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      expect(result.current.totalOlas).toBe(50);
    });

    // when two services exist on the same chain, only
    // the selected service's stake must contribute to totalOlas. The sibling's
    // stake on the same chain must not leak in.
    it('uses only selected service stake — sibling on same chain is excluded (OPE-1511)', () => {
      const targetService = makeService({
        service_config_id: DEFAULT_SERVICE_CONFIG_ID,
        chain_configs: makeChainConfig(MiddlewareChainMap.GNOSIS, {
          token: DEFAULT_SERVICE_NFT_TOKEN_ID,
        }),
      });
      const stakeByServiceConfigId: Record<string, number> = {
        [DEFAULT_SERVICE_CONFIG_ID]: 10,
        [MOCK_SERVICE_CONFIG_ID_3]: 999,
      };
      const stakeFn = jest.fn((configId?: string): number => {
        if (!configId) return 0;
        return stakeByServiceConfigId[configId] ?? 0;
      });

      mockUseBalanceContext.mockReturnValue({
        isLoaded: true,
        getStakedOlasBalanceByServiceConfigId: stakeFn,
      } as unknown as ReturnType<typeof useBalanceContext>);
      mockUseMasterBalances.mockReturnValue({
        getMasterSafeOlasBalanceOfInStr: jest.fn(() => '20'),
      } as unknown as ReturnType<typeof useMasterBalances>);
      mockUseStakingProgram.mockReturnValue({
        stakingProgramIdToMigrateTo: MOCK_STAKING_PROGRAM_ID,
      } as unknown as ReturnType<typeof useStakingProgram>);
      mockUseServices.mockReturnValue({
        selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Gnosis },
        selectedService: targetService,
        isFetched: true,
      } as unknown as ReturnType<typeof useServices>);

      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );

      // totalOlas reflects target's stake (10) + safe balance (20), not the
      // sibling's 999.
      expect(result.current.totalOlas).toBe(30);
    });
  });

  describe('olasRequiredToMigrate', () => {
    it('returns deficit when totalOlas is less than minimum', () => {
      setupMocks({ safeOlasBalanceStr: '30', stakedOlasBalance: 10 });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      // minimum is 100, totalOlas is 40 => deficit is 60
      expect(result.current.olasRequiredToMigrate).toBe(60);
    });

    it('clamps to 0 when totalOlas exceeds minimum', () => {
      setupMocks({ safeOlasBalanceStr: '80', stakedOlasBalance: 50 });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      expect(result.current.olasRequiredToMigrate).toBe(0);
    });

    it('returns 0 when totalOlas equals minimum exactly', () => {
      setupMocks({ safeOlasBalanceStr: '60', stakedOlasBalance: 40 });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      expect(result.current.olasRequiredToMigrate).toBe(0);
    });
  });

  describe('isFirstDeploy (internal) — inferred through shouldAllowSwitch', () => {
    it('treats service as not first deploy when services are not loaded', () => {
      // When isFetched=false, isFirstDeploy=false (not first deploy path)
      // So the !isFirstDeploy rule applies: blocked when !hasEnoughOlasToMigrate
      setupMocks({
        isFetched: false,
        safeOlasBalanceStr: '0',
        stakedOlasBalance: 0,
      });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      // Not first deploy + totalOlas (0) < minimum (100) => blocked
      expect(result.current.shouldAllowSwitch).toBe(false);
    });

    it('treats as first deploy when selectedService is undefined', () => {
      // No service => first deploy. safeOlasBalance < minimum => blocked
      setupMocks({
        selectedService: undefined,
        safeOlasBalanceStr: '50',
        stakedOlasBalance: 0,
      });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      expect(result.current.shouldAllowSwitch).toBe(false);
    });

    it('treats as first deploy when service token is 0 (invalid)', () => {
      setupMocks({
        serviceToken: 0,
        safeOlasBalanceStr: '50',
        stakedOlasBalance: 0,
      });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      // First deploy + safeOlasBalance (50) < minimum (100) => blocked
      expect(result.current.shouldAllowSwitch).toBe(false);
    });

    it('treats as first deploy when service token is -1 (invalid)', () => {
      setupMocks({
        serviceToken: -1,
        safeOlasBalanceStr: '50',
        stakedOlasBalance: 0,
      });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      expect(result.current.shouldAllowSwitch).toBe(false);
    });

    it('treats as not first deploy when service has a valid token', () => {
      setupMocks({
        serviceToken: DEFAULT_SERVICE_NFT_TOKEN_ID,
        safeOlasBalanceStr: '0',
        stakedOlasBalance: 150,
      });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      // Not first deploy, totalOlas (150) >= minimum (100) => allowed
      expect(result.current.shouldAllowSwitch).toBe(true);
    });
  });

  describe('shouldAllowSwitch', () => {
    describe('first deploy (no valid service token)', () => {
      it('blocks when safeOlasBalance is below minimum', () => {
        setupMocks({
          serviceToken: 0,
          safeOlasBalanceStr: '99',
          stakedOlasBalance: 0,
        });
        const { result } = renderHook(() =>
          useShouldAllowStakingContractSwitch(),
        );
        expect(result.current.shouldAllowSwitch).toBe(false);
      });

      it('allows when safeOlasBalance equals minimum', () => {
        setupMocks({
          serviceToken: 0,
          safeOlasBalanceStr: '100',
          stakedOlasBalance: 0,
        });
        const { result } = renderHook(() =>
          useShouldAllowStakingContractSwitch(),
        );
        expect(result.current.shouldAllowSwitch).toBe(true);
      });

      it('allows when safeOlasBalance exceeds minimum', () => {
        setupMocks({
          serviceToken: 0,
          safeOlasBalanceStr: '200',
          stakedOlasBalance: 0,
        });
        const { result } = renderHook(() =>
          useShouldAllowStakingContractSwitch(),
        );
        expect(result.current.shouldAllowSwitch).toBe(true);
      });

      it('uses only safeOlasBalance (staked balance is ignored for first deploy rule)', () => {
        // safeOlasBalance=50 < minimum=100, even though totalOlas=150
        setupMocks({
          serviceToken: 0,
          safeOlasBalanceStr: '50',
          stakedOlasBalance: 100,
        });
        const { result } = renderHook(() =>
          useShouldAllowStakingContractSwitch(),
        );
        expect(result.current.shouldAllowSwitch).toBe(false);
      });
    });

    describe('not first deploy (valid service token)', () => {
      it('allows when totalOlas meets minimum', () => {
        setupMocks({
          serviceToken: DEFAULT_SERVICE_NFT_TOKEN_ID,
          safeOlasBalanceStr: '60',
          stakedOlasBalance: 40,
        });
        const { result } = renderHook(() =>
          useShouldAllowStakingContractSwitch(),
        );
        expect(result.current.shouldAllowSwitch).toBe(true);
      });

      it('allows when totalOlas exceeds minimum', () => {
        setupMocks({
          serviceToken: DEFAULT_SERVICE_NFT_TOKEN_ID,
          safeOlasBalanceStr: '80',
          stakedOlasBalance: 80,
        });
        const { result } = renderHook(() =>
          useShouldAllowStakingContractSwitch(),
        );
        expect(result.current.shouldAllowSwitch).toBe(true);
      });

      it('blocks when totalOlas is below minimum', () => {
        setupMocks({
          serviceToken: DEFAULT_SERVICE_NFT_TOKEN_ID,
          safeOlasBalanceStr: '30',
          stakedOlasBalance: 20,
        });
        const { result } = renderHook(() =>
          useShouldAllowStakingContractSwitch(),
        );
        expect(result.current.shouldAllowSwitch).toBe(false);
      });

      it('considers staked balance for non-first-deploy check', () => {
        // safeOlasBalance=10 but stakedOlasBalance=90, totalOlas=100 >= minimum
        setupMocks({
          serviceToken: DEFAULT_SERVICE_NFT_TOKEN_ID,
          safeOlasBalanceStr: '10',
          stakedOlasBalance: 90,
        });
        const { result } = renderHook(() =>
          useShouldAllowStakingContractSwitch(),
        );
        expect(result.current.shouldAllowSwitch).toBe(true);
      });
    });
  });

  describe('service with no chain_configs', () => {
    it('treats as first deploy when service has empty chain_configs', () => {
      const service = makeService({ chain_configs: {} });
      setupMocks({
        selectedService: service,
        safeOlasBalanceStr: '50',
        stakedOlasBalance: 0,
      });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      // First deploy (no chain_data for gnosis) + safeOlasBalance (50) < 100 => blocked
      expect(result.current.shouldAllowSwitch).toBe(false);
    });

    it('treats as first deploy when service has null chain_configs (isNil path)', () => {
      const service = makeService({ chain_configs: null as never });
      setupMocks({
        selectedService: service,
        safeOlasBalanceStr: '50',
        stakedOlasBalance: 0,
      });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      // isNil(null) => true => chainData = null => first deploy
      expect(result.current.shouldAllowSwitch).toBe(false);
    });
  });

  describe('service with non-null chain_configs but no matching chain', () => {
    it('treats as first deploy when chain_configs has entry but chain_data is undefined', () => {
      const service = makeService({
        chain_configs: {
          gnosis: {
            ledger_config: {
              rpc: 'http://localhost',
              chain: 'gnosis' as never,
            },
            // chain_data is missing
          },
        } as never,
      });
      setupMocks({
        selectedService: service,
        safeOlasBalanceStr: '50',
        stakedOlasBalance: 0,
      });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      expect(result.current.shouldAllowSwitch).toBe(false);
    });
  });

  describe('return values', () => {
    it('returns totalOlas, olasRequiredToMigrate, and shouldAllowSwitch', () => {
      setupMocks({
        serviceToken: DEFAULT_SERVICE_NFT_TOKEN_ID,
        safeOlasBalanceStr: '75',
        stakedOlasBalance: 10,
      });
      const { result } = renderHook(() =>
        useShouldAllowStakingContractSwitch(),
      );
      expect(result.current).toEqual({
        totalOlas: 85,
        olasRequiredToMigrate: 15,
        shouldAllowSwitch: false,
      });
    });
  });
});
