import { EvmChainId, EvmChainIdMap } from '../../constants/chains';
import {
  MasterEoa,
  MasterSafe,
  WALLET_OWNER,
  WALLET_TYPE,
} from '../../constants/wallet';
import { MultisigOwners } from '../../hooks/useMultisig';
import { Address } from '../../types/Address';

export const INVALID_CHAIN_ID = 999 as EvmChainId;

export const UNKNOWN_TOKEN_ADDRESS: Address =
  '0x0000000000000000000000000000000000000001';

export const ALL_EVM_CHAIN_IDS: EvmChainId[] = [
  EvmChainIdMap.Gnosis,
  EvmChainIdMap.Base,
  EvmChainIdMap.Mode,
  EvmChainIdMap.Optimism,
  EvmChainIdMap.Polygon,
];

export const DEFAULT_EOA_ADDRESS: Address =
  '0x1234567890abcdef1234567890abcdef12345678';
export const DEFAULT_SAFE_ADDRESS: Address =
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
export const BACKUP_SIGNER_ADDRESS: Address =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
export const BACKUP_SIGNER_ADDRESS_2: Address =
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

export const makeMasterEoa = (
  address: Address = DEFAULT_EOA_ADDRESS,
): MasterEoa => ({
  address,
  type: WALLET_TYPE.EOA,
  owner: WALLET_OWNER.Master,
});

export const makeMasterSafe = (
  evmChainId: EvmChainId,
  address: Address = DEFAULT_SAFE_ADDRESS,
): MasterSafe => ({
  address,
  evmChainId,
  type: WALLET_TYPE.Safe,
  owner: WALLET_OWNER.Master,
});

export const makeMultisigOwners = (
  evmChainId: EvmChainId,
  owners: Address[],
  safeAddress: Address = DEFAULT_SAFE_ADDRESS,
): MultisigOwners => ({
  safeAddress,
  evmChainId,
  owners,
});
