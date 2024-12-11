import { Contract as MulticallContract } from 'ethers-multicall';

import { MECH_ACTIVITY_CHECKER_ABI } from '@/abis/mechActivityChecker';
import { MEME_ACTIVITY_CHECKER_ABI } from '@/abis/memeActivityChecker';
import { REQUESTER_ACTIVITY_CHECKER_ABI } from '@/abis/requesterActivityChecker';
import { STAKING_ACTIVITY_CHECKER_ABI } from '@/abis/stakingActivityChecker';
import { EvmChainId } from '@/enums/Chain';

import { MechType } from './mechs';

export enum ActivityCheckerType {
  MechActivityChecker = MechType.Agent,
  RequesterActivityChecker = MechType.Marketplace,
  Staking = 'StakingActivityChecker',
  MemeActivityChecker = 'MemeActivityChecker',
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

export const BASE_ACTIVITY_CHECKERS: ActivityCheckers = {
  [ActivityCheckerType.MemeActivityChecker]: new MulticallContract(
    '0x026AB1c5ea14E61f67d245685D9561c0c2Cb39Ba',
    MEME_ACTIVITY_CHECKER_ABI,
  ),
};

export const MODE_ACTIVITY_CHECKERS: ActivityCheckers = {
  [ActivityCheckerType.Staking]: new MulticallContract(
    '0x534c0a05b6d4d28d5f3630d6d74857b253cf8332',
    STAKING_ACTIVITY_CHECKER_ABI,
  ),
};

export const ACTIVITY_CHECKERS: {
  [chainId: number]: {
    [activityCheckerType: string]: MulticallContract;
  };
} = {
  [EvmChainId.Gnosis]: GNOSIS_ACTIVITY_CHECKERS,
  [EvmChainId.Optimism]: OPTIMISM_ACTIVITY_CHECKERS,
  [EvmChainId.Base]: BASE_ACTIVITY_CHECKERS,
  [EvmChainId.Mode]: MODE_ACTIVITY_CHECKERS,
} as const;
