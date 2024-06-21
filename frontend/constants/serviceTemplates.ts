import { ServiceTemplate } from '@/client';

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    name: 'Trader Agent',
    hash: 'bafybeid2bg4ypzwqrd3etfwmwlvopyh2muuflbgp3ji6nzz2lzbmmytgty',
    description: 'Trader agent for omen prediction markets',
    image:
      'https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75',
    configuration: {
      nft: 'bafybeiei7wb5jvrn7e7fss2t6ajnkjakgf7uaz42fvvlkolhpnez2dlfsy',
      agent_id: 14,
      threshold: 1,
      use_staking: true,
      cost_of_bond: 10000000000000000,
      olas_cost_of_bond: 10000000000000000000,
      olas_required_to_stake: 10000000000000000000,
      monthly_gas_estimate: 10000000000000000000,
      fund_requirements: {
        agent: 100000000000000000,
        safe: 5000000000000000000,
      },
    },
  },
];
