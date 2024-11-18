import { Contract as MulticallContract } from 'ethers-multicall';

import { MECH_ACTIVITY_CHECKER_ABI } from '@/abis/mechActivityChecker';
import { REQUESTER_ACTIVITY_CHECKER_ABI } from '@/abis/requesterActivityChecker';
import { ChainId } from '@/enums/Chain';

import { MechType } from './mechs';

enum ActivityCheckerType {
  MechActivityChecker = MechType.Agent,
  RequesterActivityChecker = MechType.Marketplace,
  Staking = 'StakingActivityChecker',
}

type ActivityCheckers = {
  [activityCheckerType: string]: MulticallContract;
};

export const GNOSIS_ACTIVITY_CHECKERS: ActivityCheckers = {
  [ActivityCheckerType.MechActivityChecker]: new MulticallContract(
    '0x155547857680A6D51bebC5603397488988DEb1c8',
    MECH_ACTIVITY_CHECKER_ABI,
  ),
  [ActivityCheckerType.RequesterActivityChecker]: new MulticallContract(
    '0x7Ec96996Cd146B91779f01419db42E67463817a0',
    REQUESTER_ACTIVITY_CHECKER_ABI,
  ),
};

export const OPTIMISM_ACTIVITY_CHECKERS: ActivityCheckers = {};

export const ACTIVITY_CHECKERS: {
  [chainId: number]: {
    [activityCheckerType: string]: MulticallContract;
  };
} = {
  [ChainId.Gnosis]: GNOSIS_ACTIVITY_CHECKERS,
  [ChainId.Optimism]: OPTIMISM_ACTIVITY_CHECKERS,
} as const;
