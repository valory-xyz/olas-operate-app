import { renderHook } from '@testing-library/react';

import { AGENT_CONFIG } from '../../config/agents';
import { AgentMap } from '../../constants/agent';
import { EvmChainIdMap, MiddlewareChainMap } from '../../constants/chains';
import { FIVE_SECONDS_INTERVAL } from '../../constants/intervals';
import { REACT_QUERY_KEYS } from '../../constants/reactQueryKeys';
import { STAKING_PROGRAM_IDS } from '../../constants/stakingProgram';
import {
  createStakingRewardsQuery,
  useAgentStakingRewardsDetails,
} from '../../hooks/useAgentStakingRewardsDetails';
import { useServices } from '../../hooks/useServices';
import { AgentConfig } from '../../types/Agent';
import { fetchAgentStakingRewardsInfo } from '../../utils/stakingRewards';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  makeChainConfig,
  makeMiddlewareService,
  MOCK_MULTISIG_ADDRESS,
  SERVICE_PUBLIC_ID_MAP,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
jest.mock(
  '../../context/OnlineStatusProvider',
  () => require('../mocks/onlineStatus').onlineStatusProviderMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));

jest.mock('../../utils/stakingRewards', () => ({
  fetchAgentStakingRewardsInfo: jest.fn(),
}));

jest.mock('../../hooks/useDynamicRefetchInterval', () => ({
  useDynamicRefetchInterval: jest.fn((interval: number) => interval),
}));

const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

const mockUseServices = useServices as jest.Mock;
const mockFetchRewards = fetchAgentStakingRewardsInfo as jest.Mock;

const traderConfig = AGENT_CONFIG[AgentMap.PredictTrader];
const GNOSIS = EvmChainIdMap.Gnosis;

// ---------------------------------------------------------------------------
// createStakingRewardsQuery — pure function tests
// ---------------------------------------------------------------------------
describe('createStakingRewardsQuery', () => {
  const baseParams = {
    chainId: GNOSIS,
    serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
    stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
    multisig: MOCK_MULTISIG_ADDRESS,
    serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
    agentConfig: traderConfig,
    isOnline: true,
    refetchInterval: FIVE_SECONDS_INTERVAL,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -- queryKey -----------------------------------------------------------
  describe('queryKey', () => {
    it('delegates to REACT_QUERY_KEYS.REWARDS_KEY with all params', () => {
      const result = createStakingRewardsQuery(baseParams);
      expect(result.queryKey).toEqual(
        REACT_QUERY_KEYS.REWARDS_KEY(
          GNOSIS,
          DEFAULT_SERVICE_CONFIG_ID,
          DEFAULT_STAKING_PROGRAM_ID,
          MOCK_MULTISIG_ADDRESS,
          DEFAULT_SERVICE_NFT_TOKEN_ID,
        ),
      );
    });
  });

  // -- enabled flag -------------------------------------------------------
  describe('enabled', () => {
    it('is true when all conditions are met', () => {
      const { enabled } = createStakingRewardsQuery(baseParams);
      expect(enabled).toBe(true);
    });

    it('is false when isOnline is false', () => {
      const { enabled } = createStakingRewardsQuery({
        ...baseParams,
        isOnline: false,
      });
      expect(enabled).toBe(false);
    });

    it('is false when serviceConfigId is undefined', () => {
      const { enabled } = createStakingRewardsQuery({
        ...baseParams,
        serviceConfigId: undefined,
      });
      expect(enabled).toBe(false);
    });

    it('is false when stakingProgramId is null', () => {
      const { enabled } = createStakingRewardsQuery({
        ...baseParams,
        stakingProgramId: null,
      });
      expect(enabled).toBe(false);
    });

    it('is false when stakingProgramId does not exist in STAKING_PROGRAMS', () => {
      const { enabled } = createStakingRewardsQuery({
        ...baseParams,
        stakingProgramId: 'nonexistent_program' as never,
      });
      expect(enabled).toBe(false);
    });

    it('is false when multisig is undefined', () => {
      const { enabled } = createStakingRewardsQuery({
        ...baseParams,
        multisig: undefined,
      });
      expect(enabled).toBe(false);
    });

    it.each([undefined, 0, -1])(
      'is fale when serviceNftTokenId is %s',
      (serviceNftTokenId) => {
        const { enabled } = createStakingRewardsQuery({
          ...baseParams,
          serviceNftTokenId,
        });
        expect(enabled).toBe(false);
      },
    );
  });

  // -- refetchInterval ----------------------------------------------------
  describe('refetchInterval', () => {
    it('returns FIVE_SECONDS_INTERVAL when online', () => {
      const { refetchInterval } = createStakingRewardsQuery(baseParams);
      expect(refetchInterval).toBe(FIVE_SECONDS_INTERVAL);
    });

    it('returns false when offline', () => {
      const { refetchInterval } = createStakingRewardsQuery({
        ...baseParams,
        isOnline: false,
      });
      expect(refetchInterval).toBe(false);
    });
  });

  // -- refetchOnWindowFocus -----------------------------------------------
  it('refetchOnWindowFocus is always false', () => {
    const { refetchOnWindowFocus } = createStakingRewardsQuery(baseParams);
    expect(refetchOnWindowFocus).toBe(false);
  });

  // -- queryFn ------------------------------------------------------------
  describe('queryFn', () => {
    it('returns null when staking program does not exist', async () => {
      const { queryFn } = createStakingRewardsQuery({
        ...baseParams,
        stakingProgramId: null,
      });
      const result = await queryFn();
      expect(result).toBeNull();
      expect(mockFetchRewards).not.toHaveBeenCalled();
    });

    it('calls fetchAgentStakingRewardsInfo when staking program exists', async () => {
      const mockRewardInfo = { isEligibleForRewards: true };
      mockFetchRewards.mockResolvedValue(mockRewardInfo);

      const { queryFn } = createStakingRewardsQuery(baseParams);
      const result = await queryFn();

      expect(result).toBe(mockRewardInfo);
      expect(mockFetchRewards).toHaveBeenCalledTimes(1);
      expect(mockFetchRewards).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: GNOSIS,
          serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
          stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
          multisig: MOCK_MULTISIG_ADDRESS,
          agentConfig: traderConfig,
          onError: expect.any(Function),
        }),
      );
    });

    it('onError callback logs to console.error', async () => {
      mockFetchRewards.mockImplementation(
        ({ onError }: { onError: (e: Error) => void }) => {
          onError(new Error('test-error'));
          return null;
        },
      );

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const { queryFn } = createStakingRewardsQuery(baseParams);
      await queryFn();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error getting staking rewards info',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });
});

// ---------------------------------------------------------------------------
// useAgentStakingRewardsDetails — hook tests
// ---------------------------------------------------------------------------
describe('useAgentStakingRewardsDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: null, isLoading: false });
  });

  const setupServices = (
    overrides: { isOnline?: boolean; services?: unknown[] } = {},
  ) => {
    mockUseServices.mockReturnValue({
      services: overrides.services ?? [
        makeMiddlewareService(MiddlewareChainMap.GNOSIS, {
          service_public_id: SERVICE_PUBLIC_ID_MAP.TRADER,
          service_config_id: DEFAULT_SERVICE_CONFIG_ID,
        }),
      ],
      selectedAgentConfig: traderConfig,
    });
  };

  it('extracts service fields and passes correct params to useQuery', () => {
    setupServices();

    renderHook(() =>
      useAgentStakingRewardsDetails(
        GNOSIS,
        DEFAULT_STAKING_PROGRAM_ID,
        traderConfig,
      ),
    );

    expect(mockUseQuery).toHaveBeenCalledTimes(1);
    const queryConfig = mockUseQuery.mock.calls[0][0];
    expect(queryConfig.queryKey).toEqual(
      REACT_QUERY_KEYS.REWARDS_KEY(
        GNOSIS,
        DEFAULT_SERVICE_CONFIG_ID,
        DEFAULT_STAKING_PROGRAM_ID,
        MOCK_MULTISIG_ADDRESS,
        DEFAULT_SERVICE_NFT_TOKEN_ID,
      ),
    );
    expect(queryConfig.enabled).toBe(true);
  });

  it('matches service by service_public_id and home_chain', () => {
    const gnosisService = makeMiddlewareService(MiddlewareChainMap.GNOSIS, {
      service_public_id: SERVICE_PUBLIC_ID_MAP.TRADER,
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
    });
    const baseService = makeMiddlewareService(MiddlewareChainMap.BASE, {
      service_public_id: 'other/service:0.1.0',
      service_config_id: 'sc-different-id',
    });
    setupServices({ services: [baseService, gnosisService] });

    renderHook(() =>
      useAgentStakingRewardsDetails(
        GNOSIS,
        DEFAULT_STAKING_PROGRAM_ID,
        traderConfig,
      ),
    );

    const queryConfig = mockUseQuery.mock.calls[0][0];
    expect(queryConfig.queryKey).toEqual(
      expect.arrayContaining([DEFAULT_SERVICE_CONFIG_ID]),
    );
  });

  it('passes undefined fields when no matching service is found', () => {
    setupServices({ services: [] });

    renderHook(() =>
      useAgentStakingRewardsDetails(
        GNOSIS,
        DEFAULT_STAKING_PROGRAM_ID,
        traderConfig,
      ),
    );

    const queryConfig = mockUseQuery.mock.calls[0][0];
    expect(queryConfig.enabled).toBe(false);
  });

  it('passes undefined multisig when chain_configs has no chain_data', () => {
    const serviceWithoutChainData = makeMiddlewareService(
      MiddlewareChainMap.GNOSIS,
      {
        service_public_id: SERVICE_PUBLIC_ID_MAP.TRADER,
        chain_configs: {
          [MiddlewareChainMap.GNOSIS]: {
            ledger_config: {
              rpc: 'http://localhost',
              chain: MiddlewareChainMap.GNOSIS,
            },
          },
        } as never,
      },
    );
    setupServices({ services: [serviceWithoutChainData] });

    renderHook(() =>
      useAgentStakingRewardsDetails(
        GNOSIS,
        DEFAULT_STAKING_PROGRAM_ID,
        traderConfig,
      ),
    );

    const queryConfig = mockUseQuery.mock.calls[0][0];
    expect(queryConfig.enabled).toBe(false);
  });

  it('works with a different chain (Base / AgentsFun)', () => {
    const agentsFunConfig = AGENT_CONFIG[AgentMap.AgentsFun];
    const baseService = makeMiddlewareService(MiddlewareChainMap.BASE, {
      service_public_id: agentsFunConfig.servicePublicId,
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      chain_configs: makeChainConfig(MiddlewareChainMap.BASE),
    });

    mockUseServices.mockReturnValue({
      services: [baseService],
      selectedAgentConfig: agentsFunConfig,
    });

    renderHook(() =>
      useAgentStakingRewardsDetails(
        EvmChainIdMap.Base,
        STAKING_PROGRAM_IDS.AgentsFun1,
        agentsFunConfig as AgentConfig,
      ),
    );

    const queryConfig = mockUseQuery.mock.calls[0][0];
    expect(queryConfig.queryKey).toEqual(
      REACT_QUERY_KEYS.REWARDS_KEY(
        EvmChainIdMap.Base,
        DEFAULT_SERVICE_CONFIG_ID,
        STAKING_PROGRAM_IDS.AgentsFun1,
        MOCK_MULTISIG_ADDRESS,
        DEFAULT_SERVICE_NFT_TOKEN_ID,
      ),
    );
    expect(queryConfig.enabled).toBe(true);
  });
});
