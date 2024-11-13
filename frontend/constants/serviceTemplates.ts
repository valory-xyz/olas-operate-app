import { ServiceTemplate } from '@/client';
import { ChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  // {
  //   name: 'Trader Agent',
  //   hash: 'bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u',
  //   description: 'Trader agent for omen prediction markets',
  //   image:
  //     'https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75',
  //   service_version: 'v0.18.4',
  //   home_chain_id: '100',
  //   configurations: {
  //     100: {
  //       staking_program_id: StakingProgramId.OptimusAlpha, // default, may be overwritten
  //       nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
  //       rpc: 'http://localhost:8545',
  //       agent_id: 14,
  //       threshold: 1,
  //       use_staking: true,
  //       use_mech_marketplace: true,
  //       cost_of_bond: 10000000000000000,
  //       monthly_gas_estimate: 10000000000000000000,
  //       fund_requirements: {
  //         agent: 100000000000000000,
  //         safe: 5000000000000000000,
  //       },
  //     },
  //   },
  // },
  {
    name: 'Optimus',
    hash: 'bafybeibzujtdlgsft3hnjmboa5yfni7vqc2iocjlyti5nadc55jxj3kxbu',
    description: 'Optimus',
    image:
      'https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75',
    service_version: 'v0.2.9',
    home_chain_id: `${ChainId.Optimism}`,
    configurations: {
      [ChainId.Optimism]: {
        staking_program_id: StakingProgramId.OptimusAlpha, // default, may be overwritten
        nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
        // rpc: 'http://localhost:8545',
        agent_id: 40,
        threshold: 1,
        use_staking: true,
        use_mech_marketplace: false,
        // TODO: pull fund requirements from staking program config
        cost_of_bond: 1000,
        monthly_gas_estimate: 1000,
        fund_requirements: {
          agent: 1000,
          safe: 1000,
        },
      },
      [ChainId.Ethereum]: {
        staking_program_id: StakingProgramId.OptimusAlpha, // default, may be overwritten
        nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
        // rpc: 'http://localhost:8545',
        agent_id: 40,
        threshold: 1,
        use_staking: false,
        use_mech_marketplace: false,
        // TODO: pull fund requirements from staking program config
        cost_of_bond: 1,
        monthly_gas_estimate: 1000,
        fund_requirements: {
          agent: 1000,
          safe: 1000,
        },
      },
      [ChainId.Base]: {
        staking_program_id: StakingProgramId.OptimusAlpha, // default, may be overwritten
        nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
        // rpc: 'http://localhost:8545',
        agent_id: 40,
        threshold: 1,
        use_staking: false,
        use_mech_marketplace: false,
        // TODO: pull fund requirements from staking program config
        cost_of_bond: 1,
        monthly_gas_estimate: 1000,
        fund_requirements: {
          agent: 1000,
          safe: 1000,
        },
      },
    },
  },
];
