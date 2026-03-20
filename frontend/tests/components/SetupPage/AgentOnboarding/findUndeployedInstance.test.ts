/* eslint-disable @typescript-eslint/no-var-requires */
import { findUndeployedInstance } from '@/utils';

import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap } from '../../../../constants/agent';
import { MiddlewareChainMap } from '../../../../constants/chains';
import { MiddlewareServiceResponse } from '../../../../types/Service';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  makeChainConfig,
  makeMiddlewareService,
  MOCK_SERVICE_CONFIG_ID_2,
  MOCK_SERVICE_CONFIG_ID_3,
  SERVICE_PUBLIC_ID_MAP,
} from '../../../helpers/factories';

jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({ providers: [] }));
jest.mock('../../../../hooks', () => ({
  useIsAgentGeoRestricted: jest.fn(),
  usePageState: jest.fn(),
  useServices: jest.fn(),
  useSetup: jest.fn(),
}));
jest.mock('../../../../components/AgentIntroduction', () => ({
  AgentIntroduction: () => null,
}));
jest.mock(
  '../../../../components/SetupPage/AgentOnboarding/FundingRequirementStep',
  () => ({
    FundingRequirementStep: () => null,
  }),
);
jest.mock(
  '../../../../components/SetupPage/AgentOnboarding/RestrictedRegion',
  () => ({
    RestrictedRegion: () => null,
  }),
);
jest.mock(
  '../../../../components/SetupPage/AgentOnboarding/SelectAgent',
  () => ({
    SelectAgent: () => null,
  }),
);

const traderConfig = AGENT_CONFIG[AgentMap.PredictTrader];

/**
 * Builds chain_configs with a custom token value (including null/undefined).
 * The ChainData type only allows `number | undefined` for `token`, but the
 * middleware can return `null` at runtime, so we cast to simulate that.
 */
const makeChainConfigWithToken = (
  chain: string,
  token: number | null | undefined,
) => {
  const base = makeChainConfig(
    chain as Parameters<typeof makeChainConfig>[0],
  ) as MiddlewareServiceResponse['chain_configs'];
  const chainEntry = base[chain];
  return {
    [chain]: {
      ...chainEntry,
      chain_data: { ...chainEntry.chain_data, token },
    },
  } as MiddlewareServiceResponse['chain_configs'];
};

describe('findUndeployedInstance', () => {
  it('returns the undeployed service when token is null', () => {
    const chain = traderConfig.middlewareHomeChainId;
    const undeployedService = makeMiddlewareService(chain, {
      service_public_id: traderConfig.servicePublicId,
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      chain_configs: makeChainConfigWithToken(chain, null),
    });

    const result = findUndeployedInstance(AgentMap.PredictTrader, [
      undeployedService,
    ]);

    expect(result).toBe(undeployedService);
    expect(result?.service_config_id).toBe(DEFAULT_SERVICE_CONFIG_ID);
  });

  it('returns the undeployed service when token is 0', () => {
    const undeployedService = makeMiddlewareService(
      traderConfig.middlewareHomeChainId,
      {
        service_public_id: traderConfig.servicePublicId,
        service_config_id: DEFAULT_SERVICE_CONFIG_ID,
        chain_configs: makeChainConfig(traderConfig.middlewareHomeChainId, {
          token: 0,
        }),
      },
    );

    const result = findUndeployedInstance(AgentMap.PredictTrader, [
      undeployedService,
    ]);

    expect(result).toBe(undeployedService);
  });

  it('returns the undeployed service when token is -1', () => {
    const undeployedService = makeMiddlewareService(
      traderConfig.middlewareHomeChainId,
      {
        service_public_id: traderConfig.servicePublicId,
        service_config_id: DEFAULT_SERVICE_CONFIG_ID,
        chain_configs: makeChainConfig(traderConfig.middlewareHomeChainId, {
          token: -1,
        }),
      },
    );

    const result = findUndeployedInstance(AgentMap.PredictTrader, [
      undeployedService,
    ]);

    expect(result).toBe(undeployedService);
  });

  it('returns undefined when all instances are deployed (valid token IDs)', () => {
    const deployedService1 = makeMiddlewareService(
      traderConfig.middlewareHomeChainId,
      {
        service_public_id: traderConfig.servicePublicId,
        service_config_id: DEFAULT_SERVICE_CONFIG_ID,
        chain_configs: makeChainConfig(traderConfig.middlewareHomeChainId, {
          token: DEFAULT_SERVICE_NFT_TOKEN_ID,
        }),
      },
    );
    const deployedService2 = makeMiddlewareService(
      traderConfig.middlewareHomeChainId,
      {
        service_public_id: traderConfig.servicePublicId,
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
        chain_configs: makeChainConfig(traderConfig.middlewareHomeChainId, {
          token: 99,
        }),
      },
    );

    const result = findUndeployedInstance(AgentMap.PredictTrader, [
      deployedService1,
      deployedService2,
    ]);

    expect(result).toBeUndefined();
  });

  it('returns undefined when no instances of that agent type exist', () => {
    const otherAgentService = makeMiddlewareService(MiddlewareChainMap.MODE, {
      service_public_id: SERVICE_PUBLIC_ID_MAP.OPTIMUS,
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      chain_configs: makeChainConfig(MiddlewareChainMap.MODE, { token: 0 }),
    });

    const result = findUndeployedInstance(AgentMap.PredictTrader, [
      otherAgentService,
    ]);

    expect(result).toBeUndefined();
  });

  it('returns undefined when services list is empty', () => {
    const result = findUndeployedInstance(AgentMap.PredictTrader, []);
    expect(result).toBeUndefined();
  });

  it('returns the undeployed instance among deployed and undeployed services', () => {
    const deployedService = makeMiddlewareService(
      traderConfig.middlewareHomeChainId,
      {
        service_public_id: traderConfig.servicePublicId,
        service_config_id: DEFAULT_SERVICE_CONFIG_ID,
        chain_configs: makeChainConfig(traderConfig.middlewareHomeChainId, {
          token: DEFAULT_SERVICE_NFT_TOKEN_ID,
        }),
      },
    );
    const undeployedService = makeMiddlewareService(
      traderConfig.middlewareHomeChainId,
      {
        service_public_id: traderConfig.servicePublicId,
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
        chain_configs: makeChainConfig(traderConfig.middlewareHomeChainId, {
          token: 0,
        }),
      },
    );
    const otherAgentService = makeMiddlewareService(MiddlewareChainMap.MODE, {
      service_public_id: SERVICE_PUBLIC_ID_MAP.OPTIMUS,
      service_config_id: MOCK_SERVICE_CONFIG_ID_3,
      chain_configs: makeChainConfig(MiddlewareChainMap.MODE, { token: 0 }),
    });

    const result = findUndeployedInstance(AgentMap.PredictTrader, [
      deployedService,
      undeployedService,
      otherAgentService,
    ]);

    expect(result).toBe(undeployedService);
    expect(result?.service_config_id).toBe(MOCK_SERVICE_CONFIG_ID_2);
  });
});
