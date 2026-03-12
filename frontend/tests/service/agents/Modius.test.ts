import { ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';

import { EvmChainIdMap } from '../../../constants/chains';
import { STAKING_PROGRAM_IDS } from '../../../constants/stakingProgram';
import { ModiusService } from '../../../service/agents/Modius';
import { ONE_YEAR } from '../../../service/agents/shared-services/StakedAgentService';
import { StakingState } from '../../../types/Autonolas';
import {
  DEFAULT_LIVENESS_PERIOD_S,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  makeBN,
  MOCK_MULTISIG_ADDRESS,
} from '../../helpers/factories';
import {
  createNonceActivityCheckerMock,
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
};
/* eslint-enable no-var */

shared = {
  multicallAll: jest.fn(),
  stakingContract: createStakingContractMock(),
  activityChecker: createNonceActivityCheckerMock(),
};

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-var-requires */
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

jest.mock('../../../config/stakingPrograms', () => {
  const { EvmChainIdMap } = require('../../../constants/chains');
  const { STAKING_PROGRAM_IDS } = require('../../../constants/stakingProgram');
  const {
    DEFAULT_STAKING_CONTRACT_ADDRESS: stakingAddr1,
  } = require('../../helpers/factories');

  return {
    STAKING_PROGRAMS: {
      [EvmChainIdMap.Mode]: {
        [STAKING_PROGRAM_IDS.ModiusAlpha]: {
          get activityChecker() {
            return shared.activityChecker;
          },
          get contract() {
            return shared.stakingContract;
          },
          address: stakingAddr1,
          chainId: EvmChainIdMap.Mode,
        },
      },
      [EvmChainIdMap.Base]: {},
      [EvmChainIdMap.Gnosis]: {},
      [EvmChainIdMap.Optimism]: {},
      [EvmChainIdMap.Polygon]: {},
    } as Record<number, Record<string, unknown>>,
  };
});

jest.mock('../../../config/stakingPrograms/mode', () => {
  const { EvmChainIdMap } = require('../../../constants/chains');
  const { STAKING_PROGRAM_IDS } = require('../../../constants/stakingProgram');
  const {
    DEFAULT_STAKING_CONTRACT_ADDRESS: stakingAddr1,
  } = require('../../helpers/factories');

  return {
    MODE_STAKING_PROGRAMS: {
      [STAKING_PROGRAM_IDS.ModiusAlpha]: {
        get contract() {
          return shared.stakingContract;
        },
        address: stakingAddr1,
        chainId: EvmChainIdMap.Mode,
      },
    },
  };
});
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MODE_PROGRAM = STAKING_PROGRAM_IDS.ModiusAlpha;
const MODE = EvmChainIdMap.Mode;
const GNOSIS = EvmChainIdMap.Gnosis;
const NOW_S = 1_710_100_000;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW_S * 1000);
});

// ====================================================================
// getAgentStakingRewardsInfo
// ====================================================================
describe('ModiusService.getAgentStakingRewardsInfo', () => {
  const callWith = (overrides: Record<string, unknown> = {}) =>
    ModiusService.getAgentStakingRewardsInfo({
      agentMultisigAddress: MOCK_MULTISIG_ADDRESS,
      serviceId: DEFAULT_SERVICE_NFT_TOKEN_ID,
      stakingProgramId: MODE_PROGRAM,
      chainId: MODE,
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

  it('returns undefined when serviceId is -1 (isValidServiceId check)', async () => {
    const result = await callWith({ serviceId: -1 });
    expect(result).toBeUndefined();
  });

  it('throws "Staking program not found" when program does not exist', async () => {
    await expect(
      callWith({
        chainId: GNOSIS,
        stakingProgramId: MODE_PROGRAM,
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

  const serviceInfoStaked = { 2: [5] }; // [lastNonce]
  const serviceInfoUnstaked = { 2: [] };

  /**
   * Modius uses a SINGLE multicall batch that includes activityChecker.getMultisigNonces
   * at position [7]. The response array has 8 elements:
   * [serviceInfo, livenessPeriod, rewardsPerSecond, accruedStakingReward,
   *  minStakingDeposit, tsCheckpoint, livenessRatio, currentMultisigNonces]
   */
  const buildResponse = (
    livenessRatio: number,
    currentNonces: number[],
    serviceInfo: { 2: number[] } = serviceInfoStaked,
  ) => [
    serviceInfo,
    LIVENESS_PERIOD,
    REWARDS_PER_SECOND,
    ACCRUED_REWARD,
    MIN_STAKING_DEPOSIT,
    TS_CHECKPOINT,
    livenessRatio,
    currentNonces,
  ];

  it('returns eligible when nonce difference exceeds threshold', async () => {
    // currentNonces[0]=20 - lastNonces[0]=5 = 15 >= 1 (REQUESTS_SAFETY_MARGIN) => eligible
    shared.multicallAll.mockResolvedValueOnce(buildResponse(0, [20]));

    const result = await callWith();

    expect(result).toBeDefined();
    expect(result!.isEligibleForRewards).toBe(true);
  });

  it('returns not eligible when nonce difference is below threshold', async () => {
    // currentNonces[0]=5 - lastNonces[0]=5 = 0 < 1 => not eligible
    shared.multicallAll.mockResolvedValueOnce(buildResponse(0, [5]));

    const result = await callWith();

    expect(result).toBeDefined();
    expect(result!.isEligibleForRewards).toBe(false);
  });

  it('returns not eligible when service is not staked (empty serviceInfo[2])', async () => {
    // isServiceStaked = false => eligibleRequests = 0
    shared.multicallAll.mockResolvedValueOnce(
      buildResponse(0, [100], serviceInfoUnstaked),
    );

    const result = await callWith();

    expect(result).toBeDefined();
    expect(result!.isEligibleForRewards).toBe(false);
  });

  it('returns correct accruedServiceStakingRewards', async () => {
    shared.multicallAll.mockResolvedValueOnce(buildResponse(0, [20]));

    const result = await callWith();

    expect(result!.accruedServiceStakingRewards).toBe(
      parseFloat(formatEther(`${ACCRUED_REWARD}`)),
    );
  });

  it('returns correct minimumStakedAmount (2x minStakingDeposit)', async () => {
    shared.multicallAll.mockResolvedValueOnce(buildResponse(0, [20]));

    const result = await callWith();

    const expected = parseFloat(formatEther(`${MIN_STAKING_DEPOSIT}`)) * 2;
    expect(result!.minimumStakedAmount).toBe(expected);
  });

  it('returns correct availableRewardsForEpoch', async () => {
    shared.multicallAll.mockResolvedValueOnce(buildResponse(0, [20]));

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
describe('ModiusService.getAvailableRewardsForEpoch', () => {
  it('returns undefined when contract is not found', async () => {
    const result = await ModiusService.getAvailableRewardsForEpoch(
      MODE_PROGRAM,
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

    const result = await ModiusService.getAvailableRewardsForEpoch(
      MODE_PROGRAM,
      MODE,
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
describe('ModiusService.getServiceStakingDetails', () => {
  it('returns serviceStakingStartTime and serviceStakingState', async () => {
    const tsStart = makeBN(1_710_000_000);
    const serviceInfo = { tsStart };

    shared.multicallAll.mockResolvedValueOnce([
      serviceInfo,
      StakingState.Staked,
    ]);

    const result = await ModiusService.getServiceStakingDetails(
      DEFAULT_SERVICE_NFT_TOKEN_ID,
      MODE_PROGRAM,
      MODE,
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
describe('ModiusService.getStakingContractDetails', () => {
  it('returns undefined when program is not in MODE_STAKING_PROGRAMS', async () => {
    const result = await ModiusService.getStakingContractDetails(
      STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3,
      MODE,
    );
    expect(result).toBeUndefined();
  });

  // Use real ethers.BigNumber for getStakingContractDetails tests because
  // the source calls ethers.utils.formatUnits / formatEther on these values.
  const BN = ethers.BigNumber.from;

  it('returns full details with correct calculations', async () => {
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

    const result = await ModiusService.getStakingContractDetails(
      MODE_PROGRAM,
      MODE,
    );

    if (!result) throw new Error('result should be defined');

    // availableRewards = formatUnits(5e18, 18) = 5.0
    expect(result.availableRewards).toBe(5.0);

    // maxNumServices — raw .toNumber(), no MAX_ALLOWED_SERVICES cap
    expect(result.maxNumServices).toBe(10);

    // serviceIds — identity mapping (no Number() conversion)
    expect(result.serviceIds).toEqual(serviceIds);
    expect(result.minimumStakingDuration).toBe(86400);
    expect(result.epochCounter).toBe(7);
    expect(result.livenessPeriod).toBe(DEFAULT_LIVENESS_PERIOD_S);

    // minStakingDeposit = 100 OLAS formatted
    expect(result.minStakingDeposit).toBe(100);

    // olasStakeRequired = minDeposit + minDeposit * numAgentInstances = 200
    expect(result.olasStakeRequired).toBe(200);

    // APY = rewardsPerYear * 100 / minStakingDeposit / (1 + numAgentInstances)
    const rewardsPerYear = rewardsPerSecond.mul(ONE_YEAR);
    const expectedApy =
      rewardsPerYear.mul(100).div(minStakingDeposit).toNumber() /
      (1 + numAgentInstances.toNumber());
    expect(result.apy).toBe(expectedApy);

    // rewardsPerWorkPeriod = formatEther(rewardsPerSecond) * livenessPeriod
    const expectedRewardsPerWork =
      Number(formatEther(rewardsPerSecond)) * livenessPeriod.toNumber();
    expect(result.rewardsPerWorkPeriod).toBe(expectedRewardsPerWork);
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

    const result = await ModiusService.getStakingContractDetails(
      MODE_PROGRAM,
      MODE,
    );

    expect(result).toBeDefined();
    expect(result!.apy).toBe(0);
  });
});
