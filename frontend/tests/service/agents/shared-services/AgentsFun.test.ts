import { ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';

import { EvmChainId, EvmChainIdMap } from '../../../../constants/chains';
import { STAKING_PROGRAM_IDS } from '../../../../constants/stakingProgram';
import { AgentsFunService } from '../../../../service/agents/shared-services/AgentsFun';
import { ONE_YEAR } from '../../../../service/agents/shared-services/StakedAgentService';
import { StakingState } from '../../../../types/Autonolas';
import {
  DEFAULT_LIVENESS_PERIOD_S,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  makeBN,
  MOCK_MULTISIG_ADDRESS,
} from '../../../helpers/factories';
import {
  createAgentsFunActivityCheckerMock,
  createMinimalMechContractMock,
  createStakingContractMock,
} from '../../../mocks/agentServiceMocks';

// ---------------------------------------------------------------------------
// Shared mock storage — `var` ensures declaration is hoisted above jest.mock
// factory execution. Getters inside mock factories defer reads until call-time,
// by which point the assignment below has run.
// ---------------------------------------------------------------------------
/* eslint-disable no-var */
var shared: {
  multicallAll: jest.Mock;
  stakingContract: Record<string, jest.Mock>;
  activityChecker: Record<string, jest.Mock>;
  mechContract: Record<string, jest.Mock>;
};
/* eslint-enable no-var */

shared = {
  multicallAll: jest.fn(),
  stakingContract: createStakingContractMock(),
  activityChecker: createAgentsFunActivityCheckerMock(),
  mechContract: createMinimalMechContractMock(),
};

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);

jest.mock('../../../../constants/providers', () => {
  const { EvmChainIdMap } = require('../../../../constants/chains');
  const { createProvidersMock } = require('../../../mocks/agentServiceMocks');
  return {
    PROVIDERS: createProvidersMock(EvmChainIdMap, (...args: unknown[]) =>
      shared.multicallAll(...args),
    ),
  };
});

jest.mock('../../../../config/stakingPrograms', () => {
  const { EvmChainIdMap } = require('../../../../constants/chains');
  const {
    STAKING_PROGRAM_IDS,
  } = require('../../../../constants/stakingProgram');
  const {
    DEFAULT_STAKING_CONTRACT_ADDRESS: stakingAddr1,
    SECOND_STAKING_CONTRACT_ADDRESS: stakingAddr2,
  } = require('../../../helpers/factories');

  return {
    STAKING_PROGRAMS: {
      [EvmChainIdMap.Base]: {
        [STAKING_PROGRAM_IDS.AgentsFun1]: {
          get activityChecker() {
            return shared.activityChecker;
          },
          get contract() {
            return shared.stakingContract;
          },
          get mech() {
            return shared.mechContract;
          },
          address: stakingAddr1,
          chainId: EvmChainIdMap.Base,
        },
        [STAKING_PROGRAM_IDS.MemeBaseAlpha2]: {
          get activityChecker() {
            return shared.activityChecker;
          },
          get contract() {
            return shared.stakingContract;
          },
          mech: undefined,
          address: stakingAddr2,
          chainId: EvmChainIdMap.Base,
        },
      },
      [EvmChainIdMap.Gnosis]: {},
      [EvmChainIdMap.Mode]: {},
      [EvmChainIdMap.Optimism]: {},
      [EvmChainIdMap.Polygon]: {},
    } as Record<number, Record<string, unknown>>,
  };
});

jest.mock('../../../../config/stakingPrograms/base', () => {
  const { EvmChainIdMap } = require('../../../../constants/chains');
  const {
    STAKING_PROGRAM_IDS,
  } = require('../../../../constants/stakingProgram');
  const {
    DEFAULT_STAKING_CONTRACT_ADDRESS: stakingAddr1,
  } = require('../../../helpers/factories');

  return {
    BASE_STAKING_PROGRAMS: {
      [STAKING_PROGRAM_IDS.AgentsFun1]: {
        get contract() {
          return shared.stakingContract;
        },
        address: stakingAddr1,
        chainId: EvmChainIdMap.Base,
      },
    },
  };
});
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PROGRAM_WITH_MECH = STAKING_PROGRAM_IDS.AgentsFun1;
const PROGRAM_WITHOUT_MECH = STAKING_PROGRAM_IDS.MemeBaseAlpha2;
const BASE = EvmChainIdMap.Base;
const GNOSIS = EvmChainIdMap.Gnosis;
const NOW_S = 1_710_100_000;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW_S * 1000);
});

// ====================================================================
// getAgentStakingRewardsInfo
// ====================================================================
describe('AgentsFunService.getAgentStakingRewardsInfo', () => {
  const callWith = (overrides: Record<string, unknown> = {}) =>
    AgentsFunService.getAgentStakingRewardsInfo({
      agentMultisigAddress: MOCK_MULTISIG_ADDRESS,
      serviceId: DEFAULT_SERVICE_NFT_TOKEN_ID,
      stakingProgramId: PROGRAM_WITH_MECH,
      chainId: BASE,
      ...overrides,
    });

  it('throws when chainId is falsy', async () => {
    await expect(
      callWith({ chainId: 0 as unknown as EvmChainId }),
    ).rejects.toThrow('ChainId is required');
  });

  it('returns undefined when agentMultisigAddress is falsy', async () => {
    const result = await callWith({ agentMultisigAddress: '' });
    expect(result).toBeUndefined();
  });

  it('returns undefined when serviceId is 0', async () => {
    const result = await callWith({ serviceId: 0 });
    expect(result).toBeUndefined();
  });

  it('returns undefined when serviceId is -1 (invalid)', async () => {
    const result = await callWith({ serviceId: -1 });
    expect(result).toBeUndefined();
  });

  it('throws when staking program is not found', async () => {
    await expect(
      callWith({
        chainId: GNOSIS,
        stakingProgramId: PROGRAM_WITH_MECH,
      }),
    ).rejects.toThrow('Staking program not found');
  });

  // ----------------------------------------------------------------
  // Shared fixtures
  // ----------------------------------------------------------------
  const LIVENESS_PERIOD = DEFAULT_LIVENESS_PERIOD_S; // 86400
  const REWARDS_PER_SECOND = 10;
  const ACCRUED_REWARD = BigInt('1000000000000000000'); // 1 OLAS in wei
  const MIN_STAKING_DEPOSIT = BigInt('20000000000000000000'); // 20 OLAS
  const TS_CHECKPOINT = NOW_S - 50_000;

  const serviceInfoStaked = { 2: [5, 10] }; // [lastNonce, mechCheckpoint]
  const serviceInfoUnstaked = { 2: [] };

  const buildFirstResponse = (
    livenessRatio: number,
    serviceInfo: { 2: number[] } = serviceInfoStaked,
  ) => [
    serviceInfo,
    LIVENESS_PERIOD,
    REWARDS_PER_SECOND,
    ACCRUED_REWARD,
    MIN_STAKING_DEPOSIT,
    TS_CHECKPOINT,
    livenessRatio,
  ];

  describe('mech-based eligibility (mechContract present)', () => {
    it('returns eligible when mech request count exceeds threshold', async () => {
      // livenessRatio = 0 => requiredRequests = 0 + 1 = 1
      // mechRequestCount = 100, mechCheckpoint = 10 => 90 >= 1 => eligible
      shared.multicallAll
        .mockResolvedValueOnce(buildFirstResponse(0))
        .mockResolvedValueOnce([100]);

      const result = await callWith();

      expect(result).toBeDefined();
      expect(result!.isEligibleForRewards).toBe(true);
    });

    it('returns not eligible when mech request count is below threshold', async () => {
      // mechRequestCount = 10, mechCheckpoint = 10 => 0 < 1 => not eligible
      shared.multicallAll
        .mockResolvedValueOnce(buildFirstResponse(0))
        .mockResolvedValueOnce([10]);

      const result = await callWith();

      expect(result).toBeDefined();
      expect(result!.isEligibleForRewards).toBe(false);
    });
  });

  describe('nonce-based eligibility (no mechContract)', () => {
    it('returns eligible when nonce difference exceeds threshold', async () => {
      // currentNonces[0]=20 - lastNonces[0]=5 = 15 >= 1 => eligible
      shared.multicallAll.mockResolvedValueOnce(buildFirstResponse(0));
      shared.activityChecker.getMultisigNonces.mockResolvedValueOnce([20]);

      const result = await callWith({
        stakingProgramId: PROGRAM_WITHOUT_MECH,
      });

      expect(result).toBeDefined();
      expect(result!.isEligibleForRewards).toBe(true);
    });

    it('returns not eligible when nonce difference is below threshold', async () => {
      // currentNonces[0]=5 - lastNonces[0]=5 = 0 < 1 => not eligible
      shared.multicallAll.mockResolvedValueOnce(buildFirstResponse(0));
      shared.activityChecker.getMultisigNonces.mockResolvedValueOnce([5]);

      const result = await callWith({
        stakingProgramId: PROGRAM_WITHOUT_MECH,
      });

      expect(result).toBeDefined();
      expect(result!.isEligibleForRewards).toBe(false);
    });

    it('returns not eligible when service is not staked (empty serviceInfo[2])', async () => {
      // isServiceStaked = false => eligibleRequests = 0
      shared.multicallAll.mockResolvedValueOnce(
        buildFirstResponse(0, serviceInfoUnstaked),
      );
      shared.activityChecker.getMultisigNonces.mockResolvedValueOnce([100]);

      const result = await callWith({
        stakingProgramId: PROGRAM_WITHOUT_MECH,
      });

      expect(result).toBeDefined();
      expect(result!.isEligibleForRewards).toBe(false);
    });
  });

  it('returns correct accruedServiceStakingRewards', async () => {
    shared.multicallAll
      .mockResolvedValueOnce(buildFirstResponse(0))
      .mockResolvedValueOnce([100]);

    const result = await callWith();

    expect(result!.accruedServiceStakingRewards).toBe(
      parseFloat(formatEther(`${ACCRUED_REWARD}`)),
    );
  });

  it('returns minimumStakedAmount as 2x minStakingDeposit (formatted)', async () => {
    shared.multicallAll
      .mockResolvedValueOnce(buildFirstResponse(0))
      .mockResolvedValueOnce([100]);

    const result = await callWith();

    const expected = parseFloat(formatEther(`${MIN_STAKING_DEPOSIT}`)) * 2;
    expect(result!.minimumStakedAmount).toBe(expected);
  });

  it('returns correct availableRewardsForEpoch', async () => {
    shared.multicallAll
      .mockResolvedValueOnce(buildFirstResponse(0))
      .mockResolvedValueOnce([100]);

    const result = await callWith();

    const expected = Math.max(
      REWARDS_PER_SECOND * LIVENESS_PERIOD,
      REWARDS_PER_SECOND * (NOW_S - TS_CHECKPOINT),
    );
    expect(result!.availableRewardsForEpoch).toBe(expected);
  });
});

// ====================================================================
// getAvailableRewardsForEpoch
// ====================================================================
describe('AgentsFunService.getAvailableRewardsForEpoch', () => {
  it('throws when chainId is falsy', async () => {
    await expect(
      AgentsFunService.getAvailableRewardsForEpoch(
        PROGRAM_WITH_MECH,
        0 as unknown as EvmChainId,
      ),
    ).rejects.toThrow('ChainId is required');
  });

  it('returns undefined when contract is not found', async () => {
    const result = await AgentsFunService.getAvailableRewardsForEpoch(
      PROGRAM_WITH_MECH,
      GNOSIS,
    );
    expect(result).toBeUndefined();
  });

  it('returns correct BigInt value', async () => {
    const rewardsPerSecond = 10;
    const livenessPeriod = DEFAULT_LIVENESS_PERIOD_S;
    const tsCheckpoint = NOW_S - 50_000;

    shared.multicallAll.mockResolvedValueOnce([
      rewardsPerSecond,
      livenessPeriod,
      tsCheckpoint,
    ]);

    const result = await AgentsFunService.getAvailableRewardsForEpoch(
      PROGRAM_WITH_MECH,
      BASE,
    );

    const expected = BigInt(
      Math.max(
        rewardsPerSecond * livenessPeriod,
        rewardsPerSecond * (NOW_S - tsCheckpoint),
      ),
    );
    expect(result).toBe(expected);
  });
});

// ====================================================================
// getServiceStakingDetails
// ====================================================================
describe('AgentsFunService.getServiceStakingDetails', () => {
  it('throws when chainId is falsy', async () => {
    await expect(
      AgentsFunService.getServiceStakingDetails(
        DEFAULT_SERVICE_NFT_TOKEN_ID,
        PROGRAM_WITH_MECH,
        0 as unknown as EvmChainId,
      ),
    ).rejects.toThrow('ChainId is required');
  });

  it('returns serviceStakingStartTime and serviceStakingState', async () => {
    const tsStart = makeBN(1_710_000_000);
    const serviceInfo = { tsStart };

    shared.multicallAll.mockResolvedValueOnce([
      serviceInfo,
      StakingState.Staked,
    ]);

    const result = await AgentsFunService.getServiceStakingDetails(
      DEFAULT_SERVICE_NFT_TOKEN_ID,
      PROGRAM_WITH_MECH,
      BASE,
    );

    expect(result).toEqual({
      serviceStakingStartTime: 1_710_000_000,
      serviceStakingState: StakingState.Staked,
    });
  });
});

// ====================================================================
// getStakingContractDetails
// ====================================================================
describe('AgentsFunService.getStakingContractDetails', () => {
  it('throws when chainId is falsy', async () => {
    await expect(
      AgentsFunService.getStakingContractDetails(
        PROGRAM_WITH_MECH,
        0 as unknown as EvmChainId,
      ),
    ).rejects.toThrow('ChainId is required');
  });

  it('returns undefined when not on Base chain', async () => {
    const result = await AgentsFunService.getStakingContractDetails(
      PROGRAM_WITH_MECH,
      GNOSIS,
    );
    expect(result).toBeUndefined();
  });

  it('returns undefined when staking program not in BASE_STAKING_PROGRAMS', async () => {
    const result = await AgentsFunService.getStakingContractDetails(
      PROGRAM_WITHOUT_MECH,
      BASE,
    );
    expect(result).toBeUndefined();
  });

  // Use real ethers.BigNumber for getStakingContractDetails tests because
  // the source calls ethers.utils.formatUnits / formatEther on these values.
  const BN = ethers.BigNumber.from;

  it('returns full staking contract details on Base chain', async () => {
    const availableRewardsWei = BN('5000000000000000000'); // 5 OLAS
    const maxNumServices = BN(10);
    const serviceIds = [BigInt(1), BigInt(2), BigInt(3)];
    const minStakingDuration = BN(86400);
    const minStakingDeposit = BN('100000000000000000000'); // 100 OLAS
    const rewardsPerSecond = BN('1000000000000000'); // 0.001 OLAS/s
    const numAgentInstances = BN(1);
    const livenessPeriod = BN(DEFAULT_LIVENESS_PERIOD_S);
    const epochCounter = BN(7);

    shared.multicallAll.mockResolvedValueOnce([
      availableRewardsWei,
      maxNumServices,
      serviceIds,
      minStakingDuration,
      minStakingDeposit,
      rewardsPerSecond,
      numAgentInstances,
      livenessPeriod,
      epochCounter,
    ]);

    const result = await AgentsFunService.getStakingContractDetails(
      PROGRAM_WITH_MECH,
      BASE,
    );

    expect(result).toBeDefined();

    // availableRewards = formatUnits(5e18, 18) = 5.0
    expect(result!.availableRewards).toBe(5.0);
    expect(result!.maxNumServices).toBe(10);
    expect(result!.serviceIds).toEqual(serviceIds);
    expect(result!.minimumStakingDuration).toBe(86400);
    expect(result!.epochCounter).toBe(7);
    expect(result!.livenessPeriod).toBe(DEFAULT_LIVENESS_PERIOD_S);

    // minStakingDeposit = 100 OLAS formatted
    expect(result!.minStakingDeposit).toBe(100);

    // olasStakeRequired = minDeposit + minDeposit * numAgentInstances = 200
    expect(result!.olasStakeRequired).toBe(200);

    // APY = rewardsPerYear * 100 / minStakingDeposit / (1 + numAgentInstances)
    const rewardsPerYear = rewardsPerSecond.mul(ONE_YEAR);
    const expectedApy =
      rewardsPerYear.mul(100).div(minStakingDeposit).toNumber() /
      (1 + numAgentInstances.toNumber());
    expect(result!.apy).toBe(expectedApy);

    // rewardsPerWorkPeriod = formatEther(rewardsPerSecond) * livenessPeriod
    const expectedRewardsPerWork =
      Number(formatEther(rewardsPerSecond)) * livenessPeriod.toNumber();
    expect(result!.rewardsPerWorkPeriod).toBe(expectedRewardsPerWork);
  });

  it('returns APY of 0 when rewardsPerSecond is 0', async () => {
    shared.multicallAll.mockResolvedValueOnce([
      BN(0), // availableRewards
      BN(10), // maxNumServices
      [], // serviceIds
      BN(86400), // minStakingDuration
      BN('100000000000000000000'), // minStakingDeposit
      BN(0), // rewardsPerSecond = 0
      BN(1), // numAgentInstances
      BN(DEFAULT_LIVENESS_PERIOD_S), // livenessPeriod
      BN(0), // epochCounter
    ]);

    const result = await AgentsFunService.getStakingContractDetails(
      PROGRAM_WITH_MECH,
      BASE,
    );

    expect(result).toBeDefined();
    expect(result!.apy).toBe(0);
  });

  it('returns APY of 0 when minStakingDeposit is 0', async () => {
    shared.multicallAll.mockResolvedValueOnce([
      BN(0), // availableRewards
      BN(10), // maxNumServices
      [], // serviceIds
      BN(86400), // minStakingDuration
      BN(0), // minStakingDeposit = 0
      BN('1000000000000000'), // rewardsPerSecond
      BN(1), // numAgentInstances
      BN(DEFAULT_LIVENESS_PERIOD_S), // livenessPeriod
      BN(0), // epochCounter
    ]);

    const result = await AgentsFunService.getStakingContractDetails(
      PROGRAM_WITH_MECH,
      BASE,
    );

    expect(result).toBeDefined();
    expect(result!.apy).toBe(0);
  });
});
