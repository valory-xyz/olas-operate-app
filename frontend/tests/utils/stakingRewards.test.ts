import { ZodError } from 'zod';

import { EvmChainIdMap } from '../../constants/chains';
import { fetchAgentStakingRewardsInfo } from '../../utils/stakingRewards';
import {
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  DEFAULT_TS_CHECKPOINT,
  makeRawStakingRewardsInfo,
  makeStakingRewardsInfo,
  MOCK_MULTISIG_ADDRESS,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

const mockGetAgentStakingRewardsInfo = jest.fn();

const mockAgentConfig = {
  serviceApi: {
    getAgentStakingRewardsInfo: mockGetAgentStakingRewardsInfo,
  },
  // Only serviceApi is accessed; cast to satisfy the type constraint
} as unknown as Parameters<
  typeof fetchAgentStakingRewardsInfo
>[0]['agentConfig'];

const defaultParams = {
  chainId: EvmChainIdMap.Gnosis,
  stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
  multisig: MOCK_MULTISIG_ADDRESS,
  serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
  agentConfig: mockAgentConfig,
};

describe('fetchAgentStakingRewardsInfo', () => {
  beforeEach(() => {
    mockGetAgentStakingRewardsInfo.mockReset();
  });

  it('returns null when stakingProgramId is null', async () => {
    const result = await fetchAgentStakingRewardsInfo({
      ...defaultParams,
      stakingProgramId: null,
    });
    expect(result).toBeNull();
    expect(mockGetAgentStakingRewardsInfo).not.toHaveBeenCalled();
  });

  it('returns null when stakingProgramId is undefined', async () => {
    const result = await fetchAgentStakingRewardsInfo({
      ...defaultParams,
      stakingProgramId: undefined as unknown as null,
    });
    expect(result).toBeNull();
    expect(mockGetAgentStakingRewardsInfo).not.toHaveBeenCalled();
  });

  it('calls serviceApi.getAgentStakingRewardsInfo with correct params', async () => {
    mockGetAgentStakingRewardsInfo.mockResolvedValue(
      makeRawStakingRewardsInfo(),
    );
    await fetchAgentStakingRewardsInfo(defaultParams);

    expect(mockGetAgentStakingRewardsInfo).toHaveBeenCalledTimes(1);
    expect(mockGetAgentStakingRewardsInfo).toHaveBeenCalledWith({
      agentMultisigAddress: MOCK_MULTISIG_ADDRESS,
      serviceId: DEFAULT_SERVICE_NFT_TOKEN_ID,
      stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
      chainId: EvmChainIdMap.Gnosis,
    });
  });

  it('returns null when serviceApi returns null', async () => {
    mockGetAgentStakingRewardsInfo.mockResolvedValue(null);
    const result = await fetchAgentStakingRewardsInfo(defaultParams);
    expect(result).toBeNull();
  });

  it('returns null when serviceApi returns undefined', async () => {
    mockGetAgentStakingRewardsInfo.mockResolvedValue(undefined);
    const result = await fetchAgentStakingRewardsInfo(defaultParams);
    expect(result).toBeNull();
  });

  it('parses valid response through StakingRewardsInfoSchema', async () => {
    const rawResponse = makeRawStakingRewardsInfo();
    mockGetAgentStakingRewardsInfo.mockResolvedValue(rawResponse);

    const result = await fetchAgentStakingRewardsInfo(defaultParams);
    const expected = makeStakingRewardsInfo();

    expect(result).toEqual(expected);
    // Verify tsCheckpoint was transformed from hex to number
    expect(result?.tsCheckpoint).toBe(DEFAULT_TS_CHECKPOINT);
  });

  it('returns null and calls onError when serviceApi throws', async () => {
    const error = new Error('network failure');
    mockGetAgentStakingRewardsInfo.mockRejectedValue(error);
    const onError = jest.fn();

    const result = await fetchAgentStakingRewardsInfo({
      ...defaultParams,
      onError,
    });

    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('returns null without crashing when onError is not provided and serviceApi throws', async () => {
    mockGetAgentStakingRewardsInfo.mockRejectedValue(
      new Error('network failure'),
    );

    const result = await fetchAgentStakingRewardsInfo(defaultParams);
    expect(result).toBeNull();
  });

  it('returns null and calls onError when response fails Zod validation', async () => {
    const invalidResponse = { serviceInfo: 'not-an-array' };
    mockGetAgentStakingRewardsInfo.mockResolvedValue(invalidResponse);
    const onError = jest.fn();

    const result = await fetchAgentStakingRewardsInfo({
      ...defaultParams,
      onError,
    });

    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(ZodError);
  });
});
