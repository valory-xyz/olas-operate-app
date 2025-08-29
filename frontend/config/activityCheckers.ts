/**
 * Check if the staking contract has been removed from Voting (i.e., it will no longer receive OLAS used for rewards):
 * [Etherscan Contract Link](https://etherscan.io/address/0x95418b46d5566D3d1ea62C12Aea91227E566c5c1#readContract#F10)
 * If it has been removed, it shouldn’t be considered a staking contract anymore and also won’t appear in the Voting list:
 * [Govern App](https://govern.olas.network/contracts)
 */

import { Contract as MulticallContract } from 'ethers-multicall';

import { MECH_ACTIVITY_CHECKER_ABI } from '@/abis/mechActivityChecker';
import { MEME_ACTIVITY_CHECKER_ABI } from '@/abis/memeActivityChecker';
import { REQUESTER_ACTIVITY_CHECKER_ABI } from '@/abis/requesterActivityChecker';
import { STAKING_ACTIVITY_CHECKER_ABI } from '@/abis/stakingActivityChecker';
import {
  OptimismStakingProgramId,
  STAKING_PROGRAM_IDS,
} from '@/enums/StakingProgram';
import { Address } from '@/types/Address';

export const getMechActivityCheckerContract = (
  address: Address,
): MulticallContract => {
  return new MulticallContract(address, MECH_ACTIVITY_CHECKER_ABI);
};

export const getRequesterActivityCheckerContract = (
  address: Address,
): MulticallContract => {
  return new MulticallContract(address, REQUESTER_ACTIVITY_CHECKER_ABI);
};

export const getStakingActivityCheckerContract = (
  address: Address,
): MulticallContract => {
  return new MulticallContract(address, STAKING_ACTIVITY_CHECKER_ABI);
};

export const getMemeActivityCheckerContract = (
  address: Address,
): MulticallContract => {
  return new MulticallContract(address, MEME_ACTIVITY_CHECKER_ABI);
};

export const GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS: Record<
  string,
  MulticallContract
> = {
  [STAKING_PROGRAM_IDS.PearlAlpha]: getMechActivityCheckerContract(
    '0x155547857680A6D51bebC5603397488988DEb1c8',
  ),
  [STAKING_PROGRAM_IDS.PearlBeta]: getMechActivityCheckerContract(
    '0x155547857680A6D51bebC5603397488988DEb1c8',
  ),
  [STAKING_PROGRAM_IDS.PearlBeta2]: getMechActivityCheckerContract(
    '0x155547857680A6D51bebC5603397488988DEb1c8',
  ),
  [STAKING_PROGRAM_IDS.PearlBeta3]: getMechActivityCheckerContract(
    '0x155547857680A6D51bebC5603397488988DEb1c8',
  ),
  [STAKING_PROGRAM_IDS.PearlBeta4]: getMechActivityCheckerContract(
    '0x155547857680A6D51bebC5603397488988DEb1c8',
  ),
  [STAKING_PROGRAM_IDS.PearlBeta5]: getMechActivityCheckerContract(
    '0x155547857680A6D51bebC5603397488988DEb1c8',
  ),
  [STAKING_PROGRAM_IDS.PearlBeta6]: getRequesterActivityCheckerContract(
    '0xfE1D36820546cE5F3A58405950dC2F5ccDf7975C',
  ),
  [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace]:
    getRequesterActivityCheckerContract(
      '0x7Ec96996Cd146B91779f01419db42E67463817a0',
    ),
} as const;

export const BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS: Record<
  string,
  MulticallContract
> = {
  [STAKING_PROGRAM_IDS.MemeBaseAlpha2]: getMemeActivityCheckerContract(
    '0x026AB1c5ea14E61f67d245685D9561c0c2Cb39Ba',
  ),
  [STAKING_PROGRAM_IDS.MemeBaseBeta]: getMemeActivityCheckerContract(
    '0x008F52AF7009e262967caa7Cb79468F92AFEADF9',
  ),
  [STAKING_PROGRAM_IDS.MemeBaseBeta2]: getMemeActivityCheckerContract(
    '0x026AB1c5ea14E61f67d245685D9561c0c2Cb39Ba',
  ),
  [STAKING_PROGRAM_IDS.MemeBaseBeta3]: getMemeActivityCheckerContract(
    '0x026AB1c5ea14E61f67d245685D9561c0c2Cb39Ba',
  ),
  [STAKING_PROGRAM_IDS.AgentsFun1]: getRequesterActivityCheckerContract(
    '0x87C9922A099467E5A80367553e7003349FE50106',
  ),
  [STAKING_PROGRAM_IDS.AgentsFun2]: getRequesterActivityCheckerContract(
    '0x4bEb05F76f4563DE7BCB6276915C3E1F71184D8f',
  ),
  [STAKING_PROGRAM_IDS.AgentsFun3]: getRequesterActivityCheckerContract(
    '0xF0814A105c1b684922Fce8C3b80d7B6Ff1e399F9',
  ),
} as const;

export const MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS: Record<
  string,
  MulticallContract
> = {
  [STAKING_PROGRAM_IDS.ModiusAlpha]: getStakingActivityCheckerContract(
    '0x07bc3C23DbebEfBF866Ca7dD9fAA3b7356116164',
  ),
  [STAKING_PROGRAM_IDS.OptimusAlpha]: getStakingActivityCheckerContract(
    '0x07bc3C23DbebEfBF866Ca7dD9fAA3b7356116164',
  ),
  [STAKING_PROGRAM_IDS.ModiusAlpha2]: getStakingActivityCheckerContract(
    '0x07bc3C23DbebEfBF866Ca7dD9fAA3b7356116164',
  ),
  [STAKING_PROGRAM_IDS.ModiusAlpha3]: getStakingActivityCheckerContract(
    '0x07bc3C23DbebEfBF866Ca7dD9fAA3b7356116164',
  ),
  [STAKING_PROGRAM_IDS.ModiusAlpha4]: getStakingActivityCheckerContract(
    '0x07bc3C23DbebEfBF866Ca7dD9fAA3b7356116164',
  ),
} as const;

export const OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS: Record<
  OptimismStakingProgramId,
  MulticallContract
> = {
  [STAKING_PROGRAM_IDS.OptimusAlpha2]: getStakingActivityCheckerContract(
    '0x7Fd1F4b764fA41d19fe3f63C85d12bf64d2bbf68',
  ),
  [STAKING_PROGRAM_IDS.OptimusAlpha3]: getStakingActivityCheckerContract(
    '0x7Fd1F4b764fA41d19fe3f63C85d12bf64d2bbf68',
  ),
  [STAKING_PROGRAM_IDS.OptimusAlpha4]: getStakingActivityCheckerContract(
    '0x7Fd1F4b764fA41d19fe3f63C85d12bf64d2bbf68',
  ),
} as const;
