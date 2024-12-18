import { EnvProvisionType, MiddlewareChain, ServiceTemplate } from '@/client';
import { AgentType } from '@/enums/Agent';
import { StakingProgramId } from '@/enums/StakingProgram';
import { parseEther } from '@/utils/numberFormatters';

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
    hash: 'bafybeid5qvhhn3t7eaiaarurijsjejhcogt6r3dfm7eid25to4vaivfrti',
    description: 'Memeooorr @twitter_handle', // should be overwritten with twitter username
    image:
      'https://gateway.autonolas.tech/ipfs/QmQYDGMg8m91QQkTWSSmANs5tZwKrmvUCawXZfXVVWQPcu',
    service_version: 'v0.2.0-alpha13',
    home_chain: MiddlewareChain.BASE,
    configurations: {
      [MiddlewareChain.BASE]: {
        staking_program_id: StakingProgramId.MemeBaseAlpha2, // default, may be overwritten
        nft: 'bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
        rpc: 'http://localhost:8545', // overwritten
        agent_id: 43,
        threshold: 1,
        use_staking: true,
        cost_of_bond: +parseEther(50),
        monthly_gas_estimate: +parseEther(0.03),
        fund_requirements: {
          agent: +parseEther(0.001),
          safe: +parseEther(0.001),
        },
      },
    },
    env_variables: {
      BASE_LEDGER_RPC: {
        name: 'Base ledger RPC',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      CELO_LEDGER_RPC: {
        name: 'Celo ledger RPC',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
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
      TWIKIT_COOKIES: {
        name: 'Twitter cookies',
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
      // These are fixed, but may become user provided in the future
      FEEDBACK_PERIOD_HOURS: {
        name: 'Feedback period',
        description: '',
        value: '1',
        provision_type: EnvProvisionType.FIXED,
      },
      MIN_FEEDBACK_REPLIES: {
        name: 'Minimum feedback replies',
        description: '',
        value: '10',
        provision_type: EnvProvisionType.FIXED,
      },
      RESET_PAUSE_DURATION: {
        name: 'Reset pause duration',
        description: '',
        value: '1800',
        provision_type: EnvProvisionType.FIXED,
      },
      DB_PATH: {
        name: 'DB path',
        description: '',
        value: 'persistent_data/memeooorr.db',
        provision_type: EnvProvisionType.COMPUTED,
      },
      TWIKIT_COOKIES_PATH: {
        name: 'Twitter cookies path',
        description: '',
        value: 'persistent_data/twikit_cookies.json',
        provision_type: EnvProvisionType.COMPUTED,
      },
    },
  },
  {
    agentType: AgentType.Modius,
    name: 'Optimus',
    hash: 'bafybeihqho73he6mirkodg4ubom6ngf2nkgebhmxr435yxpsxgsthu5nvy',
    description: 'Optimus',
    image:
      'https://gateway.autonolas.tech/ipfs/bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
    service_version: 'v0.18.1',
    home_chain: MiddlewareChain.MODE,
    configurations: {
      [MiddlewareChain.MODE]: {
        staking_program_id: StakingProgramId.OptimusAlpha, // default, may be overwritten
        nft: 'bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
        rpc: 'http://localhost:8545', // overwritten
        agent_id: 40,
        threshold: 1,
        use_staking: true,
        cost_of_bond: 20000000000000000000,
        monthly_gas_estimate: 5260000000000000,
        fund_requirements: {
          agent: 5000000000000000,
          safe: 0,
        },
      },
    },
    env_variables: {
      MODE_LEDGER_RPC: {
        name: 'Mode ledger RPC',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      SAFE_CONTRACT_ADDRESSES: {
        name: 'Safe contract address',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      TENDERLY_ACCESS_KEY: {
        name: 'Tenderly access key',
        description: '',
        value: '',
        provision_type: EnvProvisionType.USER,
      },
      TENDERLY_ACCOUNT_SLUG: {
        name: 'Tenderly account slug',
        description: '',
        value: '',
        provision_type: EnvProvisionType.USER,
      },
      TENDERLY_PROJECT_SLUG: {
        name: 'Tenderly project slug',
        description: '',
        value: '',
        provision_type: EnvProvisionType.USER,
      },
      STAKING_TOKEN_CONTRACT_ADDRESS: {
        name: 'Staking token contract address',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      COINGECKO_API_KEY: {
        name: 'Coingecko API key',
        description: '',
        value: '',
        provision_type: EnvProvisionType.USER,
      },
      STAKING_CHAIN: {
        name: 'Staking chain',
        description: '',
        value: 'mode',
        provision_type: EnvProvisionType.FIXED,
      },
      STAKING_ACTIVITY_CHECKER_CONTRACT_ADDRESS: {
        name: 'Staking activity checker contract address',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      MIN_SWAP_AMOUNT_THRESHOLD: {
        name: 'Minimum swap amount threshold',
        description: '',
        value: '15',
        provision_type: EnvProvisionType.FIXED,
      },
      ALLOWED_CHAINS: {
        name: 'Allowed chains',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      TARGET_INVESTMENT_CHAINS: {
        name: 'Target investment chains',
        description: '',
        value: '["mode"]',
        provision_type: EnvProvisionType.FIXED,
      },
      INITIAL_ASSETS: {
        name: 'Initial assets',
        description: '',
        value: '',
        provision_type: EnvProvisionType.COMPUTED,
      },
      SELECTED_STRATEGIES: {
        name: 'Selected strategies',
        description: '',
        value:
          '["merkl_pools_search", "balancer_pools_search", "asset_lending"]',
        provision_type: EnvProvisionType.FIXED,
      },
    },
  },
] as const;

export const getServiceTemplates = (): ServiceTemplate[] => SERVICE_TEMPLATES;

export const getServiceTemplate = (
  templateHash: string,
): ServiceTemplate | undefined =>
  SERVICE_TEMPLATES.find((template) => template.hash === templateHash);
