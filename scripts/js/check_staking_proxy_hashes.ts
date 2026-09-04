/**
 * Verifies that every staking program's `requiresPolySafe` flag matches the
 * multisig proxy hash its contract actually pins on-chain (`proxyHash()`).
 *
 * Staking contracts reject a stake when `keccak256(service.multisig.code)`
 * differs from `proxyHash()`. Pearl uses the flag to show each service only
 * the contracts it can stake on, so a wrong or missing flag surfaces as a
 * reverted stake for a real user. Every program on every chain is checked, so
 * an unflagged program that pins the PolySafe hash is caught too.
 *
 * Usage (from `frontend/`): `npx tsx ../scripts/js/check_staking_proxy_hashes.ts`
 * Override the RPC with `<CHAIN>_RPC` (e.g. `POLYGON_RPC`).
 */
import { ethers } from 'ethers';

import { STAKING_PROGRAMS } from '../../frontend/config/stakingPrograms';
import { EvmChainId, EvmChainIdMap } from '../../frontend/constants/chains';
import { POLY_SAFE_PROXY_CODEHASH } from '../../frontend/constants/stakingProgram';

const PUBLIC_RPCS: Partial<Record<EvmChainId, string>> = {
  [EvmChainIdMap.Polygon]: 'https://polygon-bor-rpc.publicnode.com',
  [EvmChainIdMap.Gnosis]: 'https://rpc.gnosischain.com',
  [EvmChainIdMap.Base]: 'https://mainnet.base.org',
  [EvmChainIdMap.Mode]: 'https://mainnet.mode.network',
  [EvmChainIdMap.Optimism]: 'https://mainnet.optimism.io',
};

const RPC_ENV_BY_CHAIN: Record<EvmChainId, string> = {
  [EvmChainIdMap.Polygon]: 'POLYGON_RPC',
  [EvmChainIdMap.Gnosis]: 'GNOSIS_RPC',
  [EvmChainIdMap.Base]: 'BASE_RPC',
  [EvmChainIdMap.Mode]: 'MODE_RPC',
  [EvmChainIdMap.Optimism]: 'OPTIMISM_RPC',
};

const PROXY_HASH_ABI = ['function proxyHash() view returns (bytes32)'];
const RETRIES = 3;
const RETRY_DELAY_MS = 2000;

let hasErrors = false;

function logError(msg: string) {
  console.error(msg);
  hasErrors = true;
}

async function readProxyHash(contract: ethers.Contract): Promise<string | null> {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return (await contract.proxyHash()).toLowerCase();
    } catch {
      if (attempt < RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }
  return null;
}

async function checkChain(chainId: EvmChainId): Promise<void> {
  const programs = STAKING_PROGRAMS[chainId];
  const rpc = process.env[RPC_ENV_BY_CHAIN[chainId]] || PUBLIC_RPCS[chainId];
  if (!rpc) {
    logError(`❌ No RPC configured for chain ${chainId}`);
    return;
  }
  const provider = new ethers.providers.StaticJsonRpcProvider(rpc, chainId);

  for (const [programId, program] of Object.entries(programs)) {
    const contract = new ethers.Contract(program.address, PROXY_HASH_ABI, provider);
    const proxyHash = await readProxyHash(contract);
    if (!proxyHash) {
      logError(`❌ ${programId} (${program.address}): proxyHash() call failed after ${RETRIES} attempts`);
      continue;
    }

    const expectsPolySafe = proxyHash === POLY_SAFE_PROXY_CODEHASH.toLowerCase();
    const flagged = !!program.requiresPolySafe;

    if (expectsPolySafe !== flagged) {
      logError(
        `❌ ${programId} (${program.address}): on-chain proxyHash ${proxyHash} ` +
          `${expectsPolySafe ? 'IS' : 'is NOT'} the PolySafe hash but requiresPolySafe=${program.requiresPolySafe}`,
      );
    } else {
      console.log(`✅ ${programId}: requiresPolySafe=${program.requiresPolySafe ?? 'undefined'} matches proxyHash`);
    }
  }
}

async function main(): Promise<void> {
  const chainIds = Object.keys(STAKING_PROGRAMS).map(Number) as EvmChainId[];

  for (const chainId of chainIds) {
    console.log(`\nChecking staking proxy hashes on chain ${chainId}`);
    await checkChain(chainId);
  }

  if (hasErrors) {
    console.error('\nStaking proxy-hash check failed.');
    process.exit(1);
  }
  console.log('\nAll staking proxy hashes match their requiresPolySafe flags.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
