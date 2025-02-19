import { Contract as MulticallContract } from 'ethers-multicall';

import { MECH_ACTIVITY_CHECKER_ABI } from '@/abis/mechActivityChecker';
import { MEME_ACTIVITY_CHECKER_ABI } from '@/abis/memeActivityChecker';
import { REQUESTER_ACTIVITY_CHECKER_ABI } from '@/abis/requesterActivityChecker';
import { STAKING_ACTIVITY_CHECKER_ABI } from '@/abis/stakingActivityChecker';
import { StakingProgramId } from '@/enums/StakingProgram';
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
  [StakingProgramId.PearlAlpha]: getMechActivityCheckerContract(
    '0x155547857680A6D51bebC5603397488988DEb1c8',
  ),
  [StakingProgramId.PearlBeta]: getMechActivityCheckerContract(
    '0x155547857680A6D51bebC5603397488988DEb1c8',
  ),
  [StakingProgramId.PearlBeta2]: getMechActivityCheckerContract(
    '0x155547857680A6D51bebC5603397488988DEb1c8',
  ),
  [StakingProgramId.PearlBeta3]: getMechActivityCheckerContract(
    '0x155547857680A6D51bebC5603397488988DEb1c8',
  ),
  [StakingProgramId.PearlBeta4]: getMechActivityCheckerContract(
    '0x155547857680A6D51bebC5603397488988DEb1c8',
  ),
  [StakingProgramId.PearlBeta5]: getMechActivityCheckerContract(
    '0x155547857680A6D51bebC5603397488988DEb1c8',
  ),
  [StakingProgramId.PearlBeta6]: getRequesterActivityCheckerContract(
    '0xfE1D36820546cE5F3A58405950dC2F5ccDf7975C',
  ),
  [StakingProgramId.PearlBetaMechMarketplace]:
    getRequesterActivityCheckerContract(
      '0x7Ec96996Cd146B91779f01419db42E67463817a0',
    ),
} as const;

export const BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS: Record<
  string,
  MulticallContract
> = {
  [StakingProgramId.MemeBaseAlpha2]: getMemeActivityCheckerContract(
    '0x026AB1c5ea14E61f67d245685D9561c0c2Cb39Ba',
  ),
  [StakingProgramId.MemeBaseBeta]: getMemeActivityCheckerContract(
    '0x008F52AF7009e262967caa7Cb79468F92AFEADF9',
  ),
  [StakingProgramId.MemeBaseBeta2]: getMemeActivityCheckerContract(
    '0x026AB1c5ea14E61f67d245685D9561c0c2Cb39Ba',
  ),
  [StakingProgramId.MemeBaseBeta3]: getMemeActivityCheckerContract(
    '0x026AB1c5ea14E61f67d245685D9561c0c2Cb39Ba',
  ),
};

export const MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS: Record<
  string,
  MulticallContract
> = {
  [StakingProgramId.ModiusAlpha]: getStakingActivityCheckerContract(
    '0x07bc3C23DbebEfBF866Ca7dD9fAA3b7356116164',
  ),
  [StakingProgramId.OptimusAlpha]: getStakingActivityCheckerContract(
    '0x07bc3C23DbebEfBF866Ca7dD9fAA3b7356116164',
  ),
  [StakingProgramId.ModiusAlpha2]: getStakingActivityCheckerContract(
    '0x07bc3C23DbebEfBF866Ca7dD9fAA3b7356116164',
  ),
  [StakingProgramId.ModiusAlpha3]: getStakingActivityCheckerContract(
    '0x07bc3C23DbebEfBF866Ca7dD9fAA3b7356116164',
  ),
  [StakingProgramId.ModiusAlpha4]: getStakingActivityCheckerContract(
    '0x07bc3C23DbebEfBF866Ca7dD9fAA3b7356116164',
  ),
};

export const CELO_STAKING_PROGRAMS_ACTIVITY_CHECKERS: Record<
  string,
  MulticallContract
> = {
  [StakingProgramId.MemeCeloAlpha2]: getMemeActivityCheckerContract(
    '0x3FD8C757dE190bcc82cF69Df3Cd9Ab15bCec1426',
  ),
};
