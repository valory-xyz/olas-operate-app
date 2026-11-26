import { ethers } from 'ethers';

import { EvmChainIdMap } from '../../../constants/chains';
import { StakingProgramId } from '../../../constants/stakingProgram';
import { ConnectService } from '../../../service/agents/Connect';
import {
  DEFAULT_LIVENESS_PERIOD_S,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  MOCK_MULTISIG_ADDRESS,
} from '../../helpers/factories';
import {
  createNonceActivityCheckerMock,
  createStakingContractMock,
} from '../../mocks/agentServiceMocks';

// `var` is hoisted above the jest.mock factories; getters read it at call time.
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

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);

jest.mock('../../../constants/providers', () => {
  const { EvmChainIdMap } = require('../../../constants/chains');
  const provider = () => ({
    provider: {},
    multicallProvider: {
      all: (...args: unknown[]) => shared.multicallAll(...args),
    },
  });
  return {
    PROVIDERS: {
      [EvmChainIdMap.Gnosis]: provider(),
      [EvmChainIdMap.Robinhood]: provider(),
    },
  };
});

jest.mock('../../../config/stakingPrograms', () => {
  const { EvmChainIdMap } = require('../../../constants/chains');
  const program = {
    get activityChecker() {
      return shared.activityChecker;
    },
    get contract() {
      return shared.stakingContract;
    },
    address: '0x228DC61b838D6eD82347a93aA2cd3e28544808Ea',
    chainId: EvmChainIdMap.Robinhood,
    stakingVersion: '0.4',
  };
  return {
    STAKING_PROGRAMS: {
      [EvmChainIdMap.Gnosis]: {},
      [EvmChainIdMap.Robinhood]: { connect_i: program },
    },
  };
});
/* eslint-enable @typescript-eslint/no-var-requires */

const ROBINHOOD = EvmChainIdMap.Robinhood;
const PROGRAM = 'connect_i' as StakingProgramId;
const NOW_S = 1_800_000_000;
// About one Marketplace request a day, as Connect's checkers are configured.
const LIVENESS_RATIO = 11_337_868_480_725;
const REWARDS_PER_SECOND = 10;
const MIN_STAKING_DEPOSIT = BigInt('2500000000000000000000');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW_S * 1000);
});

describe('ConnectService.getAgentStakingRewardsInfo', () => {
  const callWith = (overrides: Record<string, unknown> = {}) =>
    ConnectService.getAgentStakingRewardsInfo({
      agentMultisigAddress: MOCK_MULTISIG_ADDRESS,
      serviceId: DEFAULT_SERVICE_NFT_TOKEN_ID,
      stakingProgramId: PROGRAM,
      chainId: ROBINHOOD,
      ...overrides,
    });

  /**
   * The batch: [serviceInfo, livenessPeriod, rewardsPerSecond, accrued,
   * minStakingDeposit, tsCheckpoint, livenessRatio, getMultisigNonces], then
   * the two v0.4 baseline reads.
   */
  const respond = ({
    requestsSinceCheckpoint,
    secondsSinceCheckpoint = DEFAULT_LIVENESS_PERIOD_S,
    stakedNonces = [40, 7],
    awaitingBaseline = false,
  }: {
    requestsSinceCheckpoint: number;
    secondsSinceCheckpoint?: number;
    stakedNonces?: number[];
    awaitingBaseline?: boolean;
  }) =>
    shared.multicallAll.mockResolvedValueOnce([
      { 2: stakedNonces },
      DEFAULT_LIVENESS_PERIOD_S,
      REWARDS_PER_SECOND,
      BigInt('1000000000000000000'),
      MIN_STAKING_DEPOSIT,
      NOW_S - secondsSinceCheckpoint,
      LIVENESS_RATIO,
      [45, (stakedNonces[1] ?? 0) + requestsSinceCheckpoint],
      false,
      awaitingBaseline,
    ]);

  it('earns the epoch with one Marketplace request a day', async () => {
    respond({ requestsSinceCheckpoint: 1 });

    const result = await callWith();

    expect(result!.isEligibleForRewards).toBe(true);
    expect(result!.activityThisEpoch).toBe(1);
  });

  it('reports the accrued reward, the minimum stake and the epoch rewards', async () => {
    respond({ requestsSinceCheckpoint: 1 });

    const result = await callWith();

    // 1 OLAS accrued; 2 x the 2500 OLAS deposit; 10 wei/s over a day
    expect(result!.accruedServiceStakingRewards).toBe(1);
    expect(result!.minimumStakedAmount).toBe(5000);
    expect(result!.availableRewardsForEpoch).toBe(864000);
  });

  it('needs a request even right after a checkpoint', async () => {
    // the requirement never drops below one liveness period's worth
    respond({ requestsSinceCheckpoint: 0, secondsSinceCheckpoint: 0 });

    const result = await callWith();

    expect(result!.isEligibleForRewards).toBe(false);
    expect(result!.availableRewardsForEpoch).toBe(
      REWARDS_PER_SECOND * DEFAULT_LIVENESS_PERIOD_S,
    );
  });

  it('does not earn it without a request', async () => {
    respond({ requestsSinceCheckpoint: 0 });

    const result = await callWith();

    expect(result!.isEligibleForRewards).toBe(false);
  });

  it('needs a request per day since a late checkpoint', async () => {
    respond({
      requestsSinceCheckpoint: 1,
      secondsSinceCheckpoint: 2 * DEFAULT_LIVENESS_PERIOD_S,
    });

    const result = await callWith();

    expect(result!.isEligibleForRewards).toBe(false);
    // the epoch's rewards run to the late checkpoint, not one period
    expect(result!.availableRewardsForEpoch).toBe(
      REWARDS_PER_SECOND * 2 * DEFAULT_LIVENESS_PERIOD_S,
    );
  });

  it('counts requests from the checker, not the safe nonce', async () => {
    respond({ requestsSinceCheckpoint: 1 });

    await callWith();

    expect(shared.activityChecker.getMultisigNonces).toHaveBeenCalledWith(
      MOCK_MULTISIG_ADDRESS,
    );
  });

  it('is not eligible while the v0.4 baseline is awaited', async () => {
    respond({ requestsSinceCheckpoint: 3, awaitingBaseline: true });

    const result = await callWith();

    expect(result!.isEligibleForRewards).toBe(false);
    expect(result!.isAwaitingBaseline).toBe(true);
  });

  it('counts nothing for a service with no staking record', async () => {
    respond({ requestsSinceCheckpoint: 5, stakedNonces: [] });

    const result = await callWith();

    expect(result!.activityThisEpoch).toBe(0);
    expect(result!.isEligibleForRewards).toBe(false);
  });

  it('returns undefined without a multisig or a valid service id', async () => {
    expect(await callWith({ agentMultisigAddress: '' })).toBeUndefined();
    expect(await callWith({ serviceId: -1 })).toBeUndefined();
    expect(shared.multicallAll).not.toHaveBeenCalled();
  });

  it('throws for a program the chain does not have', async () => {
    await expect(callWith({ chainId: EvmChainIdMap.Gnosis })).rejects.toThrow(
      'Staking program not found',
    );
  });
});

describe('ConnectService contract reads', () => {
  const BN = ethers.BigNumber.from;

  it('reads the contract details on the instance chain', async () => {
    shared.multicallAll.mockResolvedValueOnce([
      BN('5000000000000000000'),
      BN(44),
      [BigInt(3), BigInt(9)],
      BN(259200),
      BN(MIN_STAKING_DEPOSIT.toString()),
      BN('1000000000000000'),
      BN(1),
      BN(DEFAULT_LIVENESS_PERIOD_S),
      BN(2),
    ]);

    const result = await ConnectService.getStakingContractDetails(
      PROGRAM,
      ROBINHOOD,
    );

    expect(result).toMatchObject({
      availableRewards: 5,
      maxNumServices: 44,
      serviceIds: [BigInt(3), BigInt(9)],
      // 0.001 OLAS/s over a year on a 2500 OLAS deposit, shared by 1 + 1 agent
      apy: 630.5,
      rewardsPerWorkPeriod: 86.4,
      minimumStakingDuration: 259200,
      minStakingDeposit: 2500,
      olasStakeRequired: 5000,
      epochCounter: 2,
      livenessPeriod: DEFAULT_LIVENESS_PERIOD_S,
    });
  });

  it('reports no APY for a contract paying no rewards', async () => {
    shared.multicallAll.mockResolvedValueOnce([
      BN(0),
      BN(44),
      [],
      BN(259200),
      BN(MIN_STAKING_DEPOSIT.toString()),
      BN(0),
      BN(1),
      BN(DEFAULT_LIVENESS_PERIOD_S),
      BN(2),
    ]);

    const result = await ConnectService.getStakingContractDetails(
      PROGRAM,
      ROBINHOOD,
    );

    expect(result).toMatchObject({ apy: 0, rewardsPerWorkPeriod: 0 });
  });

  it('returns undefined for a program the chain does not have', async () => {
    expect(
      await ConnectService.getStakingContractDetails(
        PROGRAM,
        EvmChainIdMap.Gnosis,
      ),
    ).toBeUndefined();
    expect(
      await ConnectService.getAvailableRewardsForEpoch(
        PROGRAM,
        EvmChainIdMap.Gnosis,
      ),
    ).toBeUndefined();
  });

  it('reads the service staking details', async () => {
    shared.multicallAll.mockResolvedValueOnce([
      { tsStart: BN(NOW_S - 100) },
      2,
    ]);

    const result = await ConnectService.getServiceStakingDetails(
      DEFAULT_SERVICE_NFT_TOKEN_ID,
      PROGRAM,
      ROBINHOOD,
    );

    expect(result).toEqual({
      serviceStakingStartTime: NOW_S - 100,
      serviceStakingState: 2,
    });
  });

  it('reads the rewards available for the epoch, late checkpoint included', async () => {
    shared.multicallAll.mockResolvedValueOnce([
      REWARDS_PER_SECOND,
      DEFAULT_LIVENESS_PERIOD_S,
      NOW_S - 2 * DEFAULT_LIVENESS_PERIOD_S,
    ]);

    const result = await ConnectService.getAvailableRewardsForEpoch(
      PROGRAM,
      ROBINHOOD,
    );

    expect(result).toBe(
      BigInt(REWARDS_PER_SECOND * 2 * DEFAULT_LIVENESS_PERIOD_S),
    );
  });
});
