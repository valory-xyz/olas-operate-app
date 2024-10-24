import { Chain } from '@/client';
import { StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';

export const MULTICALL_CONTRACT_ADDRESS: Address =
  '0xcA11bde05977b3631167028862bE2a173976CA11'; // https://github.com/mds1/multicall, https://www.multicall3.com/

export const SERVICE_REGISTRY_L2_CONTRACT_ADDRESS: Record<number, Address> = {
  [Chain.GNOSIS]: '0x9338b5153AE39BB89f50468E608eD9d764B755fD',
};

export const SERVICE_REGISTRY_TOKEN_UTILITY_CONTRACT_ADDRESS: Record<
  number,
  Address
> = {
  [Chain.GNOSIS]: '0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8',
};

export const SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES: Record<
  number,
  Record<StakingProgramId, Address>
> = {
  [Chain.GNOSIS]: {
    [StakingProgramId.Beta2]: '0x1c2F82413666d2a3fD8bC337b0268e62dDF67434',
    [StakingProgramId.Beta]: '0xeF44Fb0842DDeF59D37f85D61A1eF492bbA6135d',
    [StakingProgramId.Alpha]: '0xEE9F19b5DF06c7E8Bfc7B28745dcf944C504198A',
    [StakingProgramId.BetaMechMarketplace]:
      '0xDaF34eC46298b53a3d24CBCb431E84eBd23927dA',
  },
};

/**
 * Standard mech contract addresses
 */
export const AGENT_MECH_CONTRACT_ADDRESS: Record<number, Address> = {
  [Chain.GNOSIS]: '0x77af31De935740567Cf4fF1986D04B2c964A786a',
};

/**
 * Standard mech activity checker contract addresses
 */
export const MECH_ACTIVITY_CHECKER_CONTRACT_ADDRESS: Record<number, Address> = {
  [Chain.GNOSIS]: '0x155547857680A6D51bebC5603397488988DEb1c8',
};

/**
 * Mech marketplace contract addresses
 */
export const MECH_MARKETPLACE_CONTRACT_ADDRESS: Record<number, Address> = {
  [Chain.GNOSIS]: '0x4554fE75c1f5576c1d7F765B2A036c199Adae329',
};

/**
 * Mech marketplace activity checker contract addresses
 */
export const REQUESTER_ACTIVITY_CHECKER_CONTRACT_ADDRESS: Record<
  number,
  Address
> = {
  [Chain.GNOSIS]: '0x7Ec96996Cd146B91779f01419db42E67463817a0',
};
