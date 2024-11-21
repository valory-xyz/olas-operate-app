import { EnvProvisionType, ServiceTemplate } from '@/client';
import { AgentType } from '@/enums/Agent';
import { ChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    agentType: AgentType.PredictTrader, // TODO: remove if causes errors on middleware
    name: 'Trader Agent',
    hash: 'bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u',
    description: 'Trader agent for omen prediction markets',
    image:
      'https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75',
    service_version: 'v0.18.4',
    home_chain_id: ChainId.Gnosis.toString(),
    configurations: {
      [ChainId.Gnosis]: {
        staking_program_id: StakingProgramId.PearlBeta, // default, may be overwritten
        nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
        rpc: 'http://localhost:8545', // overwritten
        agent_id: 14,
        threshold: 1,
        use_staking: true,
        use_mech_marketplace: false,
        // TODO: pull fund requirements from staking program config
        cost_of_bond: 1000,
        monthly_gas_estimate: 1000,
        fund_requirements: {
          agent: 100000000000000000,
          safe: 5000000000000000000,
        },
      },
    },
    env_variables: {
      GNOSIS_LEDGER_RPC: {
        name: 'Gnosis ledger RPC',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      // ETHEREUM_LEDGER_RPC: {
      //   name: "Ethereum ledger RPC",
      //   description: "",
      //   value: "",
      //   provision_type: EnvProvisionType.COMPUTED
      // },
      // BASE_LEDGER_RPC: {
      //   name: "Base ledger RPC",
      //   description: "",
      //   value: "",
      //   provision_type: EnvProvisionType.COMPUTED
      // },
      // OPTIMISM_LEDGER_RPC: {
      //   name: "Optimism ledger RPC",
      //   description: "",
      //   value: "",
      //   provision_type: EnvProvisionType.COMPUTED
      // },
      STAKING_CONTRACT_ADDRESS: {
        name: 'Staking contract address',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      MECH_ACTIVITY_CHECKER_CONTRACT: {
        name: 'Mech activity checker contract',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      MECH_CONTRACT_ADDRESS: {
        name: 'Mech contract address',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      MECH_REQUEST_PRICE: {
        name: 'Mech request price',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      USE_MECH_MARKETPLACE: {
        name: 'Use Mech marketplace',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      REQUESTER_STAKING_INSTANCE_ADDRESS: {
        name: 'Requester staking instance address',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      PRIORITY_MECH_ADDRESS: {
        name: 'Priority Mech address',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
    },
  },
  //   {
  //     name: 'Optimus Test',
  //     hash: 'bafybeibzujtdlgsft3hnjmboa5yfni7vqc2iocjlyti5nadc55jxj3kxbu',
  //     description: 'Optimus',
  //     image:
  //       'https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75',
  //     service_version: 'v0.2.9',
  //     home_chain_id: `${CHAINS.OPTIMISM.chainId}`,
  //     configurations: {
  //       [CHAINS.OPTIMISM.chainId]: {
  //         staking_program_id: StakingProgramId.OptimusAlpha, // default, may be overwritten
  //         nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
  //         // rpc: 'http://localhost:8545',
  //         agent_id: 40,
  //         threshold: 1,
  //         use_staking: true,
  //         use_mech_marketplace: false,
  //         cost_of_bond: 1000,
  //         monthly_gas_estimate: 1000,
  //         fund_requirements: {
  //           agent: 1000,
  //           safe: 1000,
  //         },
  //       },
  //       [CHAINS.ETHEREUM.chainId]: {
  //         staking_program_id: StakingProgramId.OptimusAlpha, // default, may be overwritten
  //         nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
  //         // rpc: 'http://localhost:8545',
  //         agent_id: 40,
  //         threshold: 1,
  //         use_staking: false,
  //         use_mech_marketplace: false,
  //         cost_of_bond: 1,
  //         monthly_gas_estimate: 1000,
  //         fund_requirements: {
  //           agent: 1000,
  //           safe: 1000,
  //         },
  //       },
  //       [CHAINS.BASE.chainId]: {
  //         staking_program_id: StakingProgramId.OptimusAlpha, // default, may be overwritten
  //         nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
  //         // rpc: 'http://localhost:8545',
  //         agent_id: 40,
  //         threshold: 1,
  //         use_staking: false,
  //         use_mech_marketplace: false,
  //         cost_of_bond: 1,
  //         monthly_gas_estimate: 1000,
  //         fund_requirements: {
  //           agent: 1000,
  //           safe: 1000,
  //         },
  //       },
  //     },
  //   },
];

export const getServiceTemplates = (): ServiceTemplate[] => SERVICE_TEMPLATES;

export const getServiceTemplate = (
  templateHash: string,
): ServiceTemplate | undefined =>
  SERVICE_TEMPLATES.find((template) => template.hash === templateHash);
