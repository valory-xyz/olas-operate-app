import { ethers } from 'ethers';

import { AgentMap, EnvProvisionMap as EnvProvisionType } from '@/constants';
import { ServiceTemplate } from '@/types';
import { parseEther } from '@/utils';

import { MiddlewareChainMap } from '../../chains';
import { STAKING_PROGRAM_IDS } from '../../stakingProgram';
import { KPI_DESC_PREFIX } from '../constants';

export const MEMORA_SERVICE_TEMPLATE: ServiceTemplate = {
  hash: 'bafybei0000000000000000000000000000000000000000000000000000000000', // TODO: replace with actual IPFS hash after push-all
  service_version: 'v1.0.0',
  agent_release: {
    is_aea: false, // Olas SDK (Node.js agent, not Open Autonomy FSM)
    repository: {
      owner: 'khusna-memora',
      name: 'memora',
      version: 'v1.0.0',
    },
  },
  agentType: AgentMap.Memora,
  name: 'Memora — Memory Weaver', // unique name
  description: `${KPI_DESC_PREFIX} Memora is the shared memory layer for Pearl agents. It weaves, stores, and recalls verifiable memory across every agent using on-chain attestation (ERC-8004). One memory. All your agents. Forever on-chain.`,
  image:
    'https://memora-production-bfc4.up.railway.app/logo.jpg',
  home_chain: MiddlewareChainMap.GNOSIS,
  configurations: {
    [MiddlewareChainMap.GNOSIS]: {
      staking_program_id: STAKING_PROGRAM_IDS.MemoraMemoryWeaver,
      nft: 'bafybei0000000000000000000000000000000000000000000000000000000000', // TODO: replace with NFT IPFS hash
      rpc: '', // overwritten by Pearl
      agent_id: 37,
      cost_of_bond: parseEther(1),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(0.5),
          safe: parseEther(1),
        },
      },
    },
  },
  env_variables: {
    SAFE_CONTRACT_ADDRESSES: {
      name: 'Safe contract addresses',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    ALL_PARTICIPANTS: {
      name: 'All participants',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    MEMORA_DB_PATH: {
      name: 'Database path',
      description: 'Path to SQLite database for memory storage',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
  },
};
