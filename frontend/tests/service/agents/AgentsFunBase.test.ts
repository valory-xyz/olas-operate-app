/* eslint-disable @typescript-eslint/no-var-requires */
import { EvmChainIdMap, StakingProgramId } from '../../../constants';
import { STAKING_PROGRAM_IDS } from '../../../constants/stakingProgram';
import { AgentsFunBaseService } from '../../../service/agents/AgentsFunBase';
import { AgentsFunService } from '../../../service/agents/shared-services/AgentsFun';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  makeServiceStakingDetails,
  makeStakingContractDetails,
  makeStakingRewardsInfo,
} from '../../helpers/factories';

jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
jest.mock('../../../constants/providers', () => ({}));

// Mock AgentsFunService — the parent class that AgentsFunBaseService delegates to
jest.mock('../../../service/agents/shared-services/AgentsFun', () => ({
  AgentsFunService: class {
    static getAgentStakingRewardsInfo = jest.fn();
    static getAvailableRewardsForEpoch = jest.fn();
    static getServiceStakingDetails = jest.fn();
    static getStakingContractDetails = jest.fn();
  },
}));

const BASE_STAKING_PROGRAM: StakingProgramId = STAKING_PROGRAM_IDS.AgentsFun1;

const mockGetAgentStakingRewardsInfo =
  AgentsFunService.getAgentStakingRewardsInfo as jest.Mock;
const mockGetAvailableRewardsForEpoch =
  AgentsFunService.getAvailableRewardsForEpoch as jest.Mock;
const mockGetServiceStakingDetails =
  AgentsFunService.getServiceStakingDetails as jest.Mock;
const mockGetStakingContractDetails =
  AgentsFunService.getStakingContractDetails as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AgentsFunBaseService', () => {
  describe('getAgentStakingRewardsInfo', () => {
    const baseArgs = {
      agentMultisigAddress: DEFAULT_EOA_ADDRESS,
      serviceId: DEFAULT_SERVICE_NFT_TOKEN_ID,
      stakingProgramId: BASE_STAKING_PROGRAM,
    };

    it('delegates to AgentsFunService with correct args and defaults chainId to Base', async () => {
      const expected = makeStakingRewardsInfo();
      mockGetAgentStakingRewardsInfo.mockResolvedValue(expected);

      const result =
        await AgentsFunBaseService.getAgentStakingRewardsInfo(baseArgs);

      expect(mockGetAgentStakingRewardsInfo).toHaveBeenCalledTimes(1);
      expect(mockGetAgentStakingRewardsInfo).toHaveBeenCalledWith({
        ...baseArgs,
        chainId: EvmChainIdMap.Base,
      });
      expect(result).toBe(expected);
    });

    it('passes custom chainId when provided', async () => {
      const expected = makeStakingRewardsInfo();
      mockGetAgentStakingRewardsInfo.mockResolvedValue(expected);

      const customChainId = EvmChainIdMap.Gnosis;
      const result = await AgentsFunBaseService.getAgentStakingRewardsInfo({
        ...baseArgs,
        chainId: customChainId,
      });

      expect(mockGetAgentStakingRewardsInfo).toHaveBeenCalledWith({
        ...baseArgs,
        chainId: customChainId,
      });
      expect(result).toBe(expected);
    });
  });

  describe('getAvailableRewardsForEpoch', () => {
    it('delegates to AgentsFunService and defaults chainId to Base', async () => {
      const expected = BigInt(1000);
      mockGetAvailableRewardsForEpoch.mockResolvedValue(expected);

      const result =
        await AgentsFunBaseService.getAvailableRewardsForEpoch(
          BASE_STAKING_PROGRAM,
        );

      expect(mockGetAvailableRewardsForEpoch).toHaveBeenCalledTimes(1);
      expect(mockGetAvailableRewardsForEpoch).toHaveBeenCalledWith(
        BASE_STAKING_PROGRAM,
        EvmChainIdMap.Base,
      );
      expect(result).toBe(expected);
    });

    it('passes custom chainId when provided', async () => {
      const expected = BigInt(2000);
      mockGetAvailableRewardsForEpoch.mockResolvedValue(expected);

      const customChainId = EvmChainIdMap.Optimism;
      const result = await AgentsFunBaseService.getAvailableRewardsForEpoch(
        BASE_STAKING_PROGRAM,
        customChainId,
      );

      expect(mockGetAvailableRewardsForEpoch).toHaveBeenCalledWith(
        BASE_STAKING_PROGRAM,
        customChainId,
      );
      expect(result).toBe(expected);
    });
  });

  describe('getServiceStakingDetails', () => {
    it('delegates to AgentsFunService and defaults chainId to Base', async () => {
      const expected = makeServiceStakingDetails();
      mockGetServiceStakingDetails.mockResolvedValue(expected);

      const result = await AgentsFunBaseService.getServiceStakingDetails(
        DEFAULT_SERVICE_NFT_TOKEN_ID,
        BASE_STAKING_PROGRAM,
      );

      expect(mockGetServiceStakingDetails).toHaveBeenCalledTimes(1);
      expect(mockGetServiceStakingDetails).toHaveBeenCalledWith(
        DEFAULT_SERVICE_NFT_TOKEN_ID,
        BASE_STAKING_PROGRAM,
        EvmChainIdMap.Base,
      );
      expect(result).toBe(expected);
    });

    it('passes custom chainId when provided', async () => {
      const expected = makeServiceStakingDetails();
      mockGetServiceStakingDetails.mockResolvedValue(expected);

      const customChainId = EvmChainIdMap.Mode;
      const result = await AgentsFunBaseService.getServiceStakingDetails(
        DEFAULT_SERVICE_NFT_TOKEN_ID,
        BASE_STAKING_PROGRAM,
        customChainId,
      );

      expect(mockGetServiceStakingDetails).toHaveBeenCalledWith(
        DEFAULT_SERVICE_NFT_TOKEN_ID,
        BASE_STAKING_PROGRAM,
        customChainId,
      );
      expect(result).toBe(expected);
    });
  });

  describe('getStakingContractDetails', () => {
    it('delegates to AgentsFunService and defaults chainId to Base', async () => {
      const expected = makeStakingContractDetails();
      mockGetStakingContractDetails.mockResolvedValue(expected);

      const result =
        await AgentsFunBaseService.getStakingContractDetails(
          BASE_STAKING_PROGRAM,
        );

      expect(mockGetStakingContractDetails).toHaveBeenCalledTimes(1);
      expect(mockGetStakingContractDetails).toHaveBeenCalledWith(
        BASE_STAKING_PROGRAM,
        EvmChainIdMap.Base,
      );
      expect(result).toBe(expected);
    });

    it('passes custom chainId when provided', async () => {
      const expected = makeStakingContractDetails();
      mockGetStakingContractDetails.mockResolvedValue(expected);

      const customChainId = EvmChainIdMap.Polygon;
      const result = await AgentsFunBaseService.getStakingContractDetails(
        BASE_STAKING_PROGRAM,
        customChainId,
      );

      expect(mockGetStakingContractDetails).toHaveBeenCalledWith(
        BASE_STAKING_PROGRAM,
        customChainId,
      );
      expect(result).toBe(expected);
    });
  });
});
