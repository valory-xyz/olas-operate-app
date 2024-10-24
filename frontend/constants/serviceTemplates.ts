import { ServiceTemplate } from '@/client';
import { StakingProgramId } from '@/enums/StakingProgram';

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    name: 'Trader Agent',
    hash: 'bafybeidsdziadn7hpzvmthrudvezkblq2wvotpqhla36tgxnwb4hhwrwxi',
    // hash: 'bafybeibbloa4w33vj4bvdkso7pzk6tr3duvxjpecbx4mur4ix6ehnwb5uu', // temporary
    description: 'Trader agent for omen prediction markets',
    image:
      'https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75',
    service_version: 'v0.18.3',
    home_chain_id: '100',
    configurations: {
      100: {
        staking_program_id: StakingProgramId.Beta, // default, may be overwritten
        nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
        rpc: 'http://localhost:8545',
        agent_id: 14,
        threshold: 1,
        use_staking: true,
        use_mech_marketplace: true,
        cost_of_bond: 10000000000000000,
        monthly_gas_estimate: 10000000000000000000,
        fund_requirements: {
          agent: 100000000000000000,
          safe: 5000000000000000000,
        },
      },
    },
  },
];
