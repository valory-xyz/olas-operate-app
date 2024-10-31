import { MiddlewareChain } from '@/client';
import { StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';

export const MULTICALL_CONTRACT_ADDRESS: Address =
  '0xcA11bde05977b3631167028862bE2a173976CA11'; // https://github.com/mds1/multicall, https://www.multicall3.com/

export const SERVICE_REGISTRY_L2_CONTRACT_ADDRESS: Record<number, Address> = {
  // [MiddlewareChain.GNOSIS]: '0x9338b5153AE39BB89f50468E608eD9d764B755fD',
  [MiddlewareChain.OPTIMISM]: '0x3d77596beb0f130a4415df3D2D8232B3d3D31e44',
};

export const SERVICE_REGISTRY_TOKEN_UTILITY_CONTRACT_ADDRESS: Record<
  number,
  Address
> = {
  // [MiddlewareChain.GNOSIS]: '0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8',
  [MiddlewareChain.OPTIMISM]: '0xBb7e1D6Cb6F243D6bdE81CE92a9f2aFF7Fbe7eac',
};

export const SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES: Record<
  number,
  Record<StakingProgramId, Address>
> = {
  // [Chain.GNOSIS]: {
  //   [StakingProgramId.Beta2]: '0x1c2F82413666d2a3fD8bC337b0268e62dDF67434',
  //   [StakingProgramId.Beta]: '0xeF44Fb0842DDeF59D37f85D61A1eF492bbA6135d',
  //   [StakingProgramId.Alpha]: '0xEE9F19b5DF06c7E8Bfc7B28745dcf944C504198A',
  //   [StakingProgramId.BetaMechMarketplace]:
  //     '0xDaF34eC46298b53a3d24CBCb431E84eBd23927dA',
  // },
  [MiddlewareChain.OPTIMISM]: {
    [StakingProgramId.OptimusAlpha]:
      '0x88996bbdE7f982D93214881756840cE2c77C4992',
  },
};

// /**
//  * Standard mech contract addresses
//  */
// export const AGENT_MECH_CONTRACT_ADDRESS: Record<number, Address> = {
//   [Chain.GNOSIS]: '0x77af31De935740567Cf4fF1986D04B2c964A786a',
// };

// /**
//  * Standard mech activity checker contract addresses
//  */
// export const MECH_ACTIVITY_CHECKER_CONTRACT_ADDRESS: Record<number, Address> = {
//   [Chain.GNOSIS]: '0x155547857680A6D51bebC5603397488988DEb1c8',
// };

// /**
//  * Mech marketplace contract addresses
//  */
// export const MECH_MARKETPLACE_CONTRACT_ADDRESS: Record<number, Address> = {
//   [Chain.GNOSIS]: '0x4554fE75c1f5576c1d7F765B2A036c199Adae329',
// };

// /**
//  * Mech marketplace activity checker contract addresses
//  */
// export const REQUESTER_ACTIVITY_CHECKER_CONTRACT_ADDRESS: Record<
//   number,
//   Address
// > = {
//   [Chain.GNOSIS]: '0x7Ec96996Cd146B91779f01419db42E67463817a0',
// };

export const STAKING_ACTIVITY_CHECKER_CONTRACT_ADDRESS: Record<
  number,
  Address
> = {
  [MiddlewareChain.OPTIMISM]: '0x7Fd1F4b764fA41d19fe3f63C85d12bf64d2bbf68',
};
