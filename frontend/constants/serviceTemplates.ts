import { EnvProvisionType, MiddlewareChain, ServiceTemplate } from '@/client';
import { AgentType } from '@/enums/Agent';
import { StakingProgramId } from '@/enums/StakingProgram';

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    agentType: AgentType.PredictTrader, // TODO: remove if causes errors on middleware
    name: 'Trader Agent',
    hash: 'bafybeicts6zhavxzz2rxahz3wzs2pzamoq64n64wp4q4cdanfuz7id6c2q',
    description: 'Trader agent for omen prediction markets',
    image:
      'https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75',
    service_version: 'v0.18.4',
    home_chain: MiddlewareChain.GNOSIS,
    configurations: {
      [MiddlewareChain.GNOSIS]: {
        staking_program_id: StakingProgramId.PearlBeta, // default, may be overwritten
        nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
        rpc: 'http://localhost:8545', // overwritten
        agent_id: 14,
        threshold: 1,
        use_staking: true,
        use_mech_marketplace: false,
        // TODO: pull fund requirements from staking program config
        cost_of_bond: 10000000000000000,
        monthly_gas_estimate: 10000000000000000000,
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
  //     home_chain: `${CHAINS.OPTIMISM}`,
  //     configurations: {
  //       [CHAINS.OPTIMISM.middlewareChain]: {
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
  //       [CHAINS.ETHEREUM.middlewareChain]: {
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
  //       [CHAINS.BASE.middlewareChain]: {
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
  {
    agentType: AgentType.Memeooorr,
    name: 'Memeooorr',
    hash: '', // TODO: fix value
    description: 'Memeooorr @twitter_handle', // should be overwritten with twitter username
    image:
      'https://gateway.autonolas.tech/ipfs/QmQYDGMg8m91QQkTWSSmANs5tZwKrmvUCawXZfXVVWQPcu',
    service_version: 'v0.0.1',
    home_chain: MiddlewareChain.BASE,
    configurations: {
      [MiddlewareChain.BASE]: {
        staking_program_id: StakingProgramId.MemeBaseAlpha, // default, may be overwritten
        nft: 'bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
        rpc: 'http://localhost:8545', // overwritten
        agent_id: 43,
        threshold: 1,
        use_staking: true,
        cost_of_bond: 50000000000000000000,
        monthly_gas_estimate: 50000000000000000, // 0.05
        fund_requirements: {
          agent: 1000000000000000, // 0.001
          safe: 2000000000000000, // 0.002
        },
      },
    },
    env_variables: {
      TWIKIT_USERNAME: {
        name: 'Twitter username',
        description: '',
        value: '',
        provision_type: EnvProvisionType.USER,
      },
      TWIKIT_EMAIL: {
        name: 'Twitter email',
        description: '',
        value: '',
        provision_type: EnvProvisionType.USER,
      },
      TWIKIT_PASSWORD: {
        name: 'Twitter password',
        description: '',
        value: '',
        provision_type: EnvProvisionType.USER,
      },
      GENAI_API_KEY: {
        name: 'Gemini api key',
        description: '',
        value: '',
        provision_type: EnvProvisionType.USER,
      },
      PERSONA: {
        name: 'Persona description',
        description: '',
        value: '',
        provision_type: EnvProvisionType.USER,
      },
    },
  },
] as const;

export const getServiceTemplates = (): ServiceTemplate[] => SERVICE_TEMPLATES;

export const getServiceTemplate = (
  templateHash: string,
): ServiceTemplate | undefined =>
  SERVICE_TEMPLATES.find((template) => template.hash === templateHash);
