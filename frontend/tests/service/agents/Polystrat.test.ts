/* eslint-disable @typescript-eslint/no-var-requires */
import { ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';

import { EvmChainIdMap } from '../../../constants/chains';
import { STAKING_PROGRAM_IDS } from '../../../constants/stakingProgram';
import { Polystrat } from '../../../service/agents/Polystrat';
import { ONE_YEAR } from '../../../service/agents/shared-services/StakedAgentService';
import { StakingState } from '../../../types/Autonolas';
import {
  DEFAULT_LIVENESS_PERIOD_S,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  makeBN,
  MOCK_MULTISIG_ADDRESS,
} from '../../helpers/factories';
import {
  createMechActivityCheckerMock,
  createMechContractMock,
  createStakingContractMock,
} from '../../mocks/agentServiceMocks';

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
  activityChecker: createMechActivityCheckerMock(),
  mechContract: createMechContractMock(),
};

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);

jest.mock('../../../constants/providers', () => {
  const { EvmChainIdMap } = require('../../../constants/chains');
  const { createProvidersMock } = require('../../mocks/agentServiceMocks');
  return {
    PROVIDERS: createProvidersMock(EvmChainIdMap, (...args: unknown[]) =>
      shared.multicallAll(...args),
    ),
  };
});

jest.mock('../../../config/mechs', () => ({
  MechType: {
    MarketplaceV2: 'mech-marketplace-2v',
  },
}));

jest.mock('../../../config/stakingPrograms', () => {
  const { EvmChainIdMap } = require('../../../constants/chains');
  const { STAKING_PROGRAM_IDS } = require('../../../constants/stakingProgram');
  const {
    DEFAULT_STAKING_CONTRACT_ADDRESS: stakingAddr1,
    SECOND_STAKING_CONTRACT_ADDRESS: stakingAddr2,
  } = require('../../helpers/factories');

  return {
    STAKING_PROGRAMS: {
      [EvmChainIdMap.Polygon]: {
        [STAKING_PROGRAM_IDS.PolygonBeta1]: {
          get activityChecker() {
            return shared.activityChecker;
          },
          get contract() {
            return shared.stakingContract;
          },
          get mech() {
            return shared.mechContract;
          },
          mechType: 'mech-marketplace-2v',
          address: stakingAddr1,
          chainId: EvmChainIdMap.Polygon,
        },
        [STAKING_PROGRAM_IDS.PolygonBeta2]: {
          get activityChecker() {
            return shared.activityChecker;
          },
          get contract() {
            return shared.stakingContract;
          },
          mech: undefined,
          address: stakingAddr2,
          chainId: EvmChainIdMap.Polygon,
        },
      },
      [EvmChainIdMap.Base]: {},
      [EvmChainIdMap.Gnosis]: {},
      [EvmChainIdMap.Mode]: {},
      [EvmChainIdMap.Optimism]: {},
    } as Record<number, Record<string, unknown>>,
  };
});
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PROGRAM_WITH_MECH = STAKING_PROGRAM_IDS.PolygonBeta1;
const PROGRAM_WITHOUT_MECH = STAKING_PROGRAM_IDS.PolygonBeta2;
const POLYGON = EvmChainIdMap.Polygon;
const GNOSIS = EvmChainIdMap.Gnosis;
const NOW_S = 1_710_100_000;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW_S * 1000);
});

// ====================================================================
// getAgentStakingRewardsInfo
// ====================================================================
describe('Polystrat.getAgentStakingRewardsInfo', () => {
  const callWith = (overrides: Record<string, unknown> = {}) =>
    Polystrat.getAgentStakingRewardsInfo({
      agentMultisigAddress: MOCK_MULTISIG_ADDRESS,
      serviceId: DEFAULT_SERVICE_NFT_TOKEN_ID,
      stakingProgramId: PROGRAM_WITH_MECH,
      chainId: POLYGON,
      ...overrides,
    });

  it('returns undefined when agentMultisigAddress is falsy', async () => {
    const result = await callWith({ agentMultisigAddress: '' });
    expect(result).toBeUndefined();
  });

  it('returns undefined when serviceId is 0', async () => {
    const result = await callWith({ serviceId: 0 });
    expect(result).toBeUndefined();
  });

  it('throws "Staking program not found" when program does not exist on chain', async () => {
    await expect(
      callWith({
        chainId: GNOSIS,
        stakingProgramId: PROGRAM_WITH_MECH,
      }),
    ).rejects.toThrow('Staking program not found');
  });

  it('throws "Mech contract is not defined" when mechContract is missing', async () => {
    await expect(
      callWith({ stakingProgramId: PROGRAM_WITHOUT_MECH }),
    ).rejects.toThrow('Mech contract is not defined');
  });

  // ----------------------------------------------------------------
  // Shared fixtures
  // ----------------------------------------------------------------
  const LIVENESS_PERIOD = DEFAULT_LIVENESS_PERIOD_S; // 86400
  const LIVENESS_RATIO = 0;
  const REWARDS_PER_SECOND = 10;
  const ACCRUED_REWARD = BigInt('1000000000000000000'); // 1 OLAS in wei
  const MIN_STAKING_DEPOSIT = BigInt('20000000000000000000'); // 20 OLAS
  const TS_CHECKPOINT = NOW_S - 50_000;

  const serviceInfoStaked = { 2: [5, 10] }; // [lastNonce, mechCheckpoint]

  const buildMulticallResponse = (
    mechRequestCount: number,
    livenessRatio = LIVENESS_RATIO,
    serviceInfo: { 2: number[] } = serviceInfoStaked,
  ) => [
    mechRequestCount, // mechRequestCount
    serviceInfo, // serviceInfo
    LIVENESS_PERIOD, // livenessPeriod
    livenessRatio, // livenessRatio
    REWARDS_PER_SECOND, // rewardsPerSecond
    ACCRUED_REWARD, // accruedStakingReward
    MIN_STAKING_DEPOSIT, // minStakingDeposit
    TS_CHECKPOINT, // tsCheckpoint
  ];

  it('uses mapRequestCounts for MechType.MarketplaceV2 programs', async () => {
    shared.multicallAll.mockResolvedValueOnce(buildMulticallResponse(100));

    await callWith();

    // mapRequestCounts should have been called (it returns a sentinel value
    // that is included in the contract-calls array)
    expect(shared.mechContract.mapRequestCounts).toHaveBeenCalledWith(
      MOCK_MULTISIG_ADDRESS,
    );
  });

  it('returns eligible when mech request count exceeds threshold', async () => {
    // livenessRatio = 0 => requiredRequests = 0 + 1 = 1
    // mechRequestCount = 100, mechCheckpoint = 10 => 90 >= 1 => eligible
    shared.multicallAll.mockResolvedValueOnce(buildMulticallResponse(100));

    const result = await callWith();

    expect(result).toBeDefined();
    expect(result!.isEligibleForRewards).toBe(true);
  });

  it('returns not eligible when mech request count is below threshold', async () => {
    // mechRequestCount = 10, mechCheckpoint = 10 => 0 < 1 => not eligible
    shared.multicallAll.mockResolvedValueOnce(buildMulticallResponse(10));

    const result = await callWith();

    expect(result).toBeDefined();
    expect(result!.isEligibleForRewards).toBe(false);
  });

  it('returns correct accruedServiceStakingRewards', async () => {
    shared.multicallAll.mockResolvedValueOnce(buildMulticallResponse(100));

    const result = await callWith();

    expect(result!.accruedServiceStakingRewards).toBe(
      parseFloat(formatEther(`${ACCRUED_REWARD}`)),
    );
  });

  it('returns minimumStakedAmount as 2x minStakingDeposit (formatted)', async () => {
    shared.multicallAll.mockResolvedValueOnce(buildMulticallResponse(100));

    const result = await callWith();

    const expected = parseFloat(formatEther(`${MIN_STAKING_DEPOSIT}`)) * 2;
    expect(result!.minimumStakedAmount).toBe(expected);
  });

  it('returns correct availableRewardsForEpoch', async () => {
    shared.multicallAll.mockResolvedValueOnce(buildMulticallResponse(100));

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
describe('Polystrat.getAvailableRewardsForEpoch', () => {
  it('returns undefined when contract is not found', async () => {
    const result = await Polystrat.getAvailableRewardsForEpoch(
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

    const result = await Polystrat.getAvailableRewardsForEpoch(
      PROGRAM_WITH_MECH,
      POLYGON,
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
describe('Polystrat.getServiceStakingDetails', () => {
  it('returns serviceStakingStartTime and serviceStakingState', async () => {
    const tsStart = makeBN(1_710_000_000);
    const serviceInfo = { tsStart };

    shared.multicallAll.mockResolvedValueOnce([
      serviceInfo,
      StakingState.Staked,
    ]);

    const result = await Polystrat.getServiceStakingDetails(
      DEFAULT_SERVICE_NFT_TOKEN_ID,
      PROGRAM_WITH_MECH,
      POLYGON,
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
describe('Polystrat.getStakingContractDetails', () => {
  it('returns undefined when contract is not found', async () => {
    const result = await Polystrat.getStakingContractDetails(
      PROGRAM_WITH_MECH,
      GNOSIS,
    );
    expect(result).toBeUndefined();
  });

  // Use real ethers.BigNumber for getStakingContractDetails tests because
  // the source calls ethers.utils.formatUnits / formatEther on these values.
  const BN = ethers.BigNumber.from;

  it('returns full staking contract details', async () => {
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

    const result = await Polystrat.getStakingContractDetails(
      PROGRAM_WITH_MECH,
      POLYGON,
    );

    expect(result).toBeDefined();

    // availableRewards = formatUnits(5e18, 18) = 5.0
    expect(result!.availableRewards).toBe(5.0);

    // maxNumServices — raw .toNumber(), no cap
    expect(result!.maxNumServices).toBe(10);

    // serviceIds — identity-mapped (no Number conversion)
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

    const result = await Polystrat.getStakingContractDetails(
      PROGRAM_WITH_MECH,
      POLYGON,
    );

    expect(result).toBeDefined();
    expect(result!.apy).toBe(0);
  });
});
