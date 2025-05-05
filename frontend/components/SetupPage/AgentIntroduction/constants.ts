import { OnboardingStep } from './IntroductionStep';

export const PREDICTION_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Market opportunity finder',
    desc: 'Prediction agents actively scan prediction markets to identify new opportunities for investment.',
    imgSrc: 'setup-agent-prediction-1',
  },
  {
    title: 'Place intelligent bets',
    desc: 'Uses AI to make predictions and place bets on events by analyzing market trends and real-time information.',
    imgSrc: 'setup-agent-prediction-2',
  },
  {
    title: 'Collect earnings',
    desc: 'It collects earnings on the go, as the results of the corresponding prediction markets are finalized.',
    imgSrc: 'setup-agent-prediction-3',
  },
] as const;

export const AGENTS_FUND_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Your personal AI influencer',
    desc: 'Create a custom persona, and your agent will post autonomously on X, crafting engaging content to match the character you design',
    imgSrc: 'setup-agent-agents.fun-1',
  },
  {
    title: 'Create and interact with memecoins',
    desc: 'Your agent will autonomously create its own tokens and explore memecoins deployed by other agents.',
    helper:
      'This isn’t financial advice. Agents.Fun operates at your own risk and may experience losses — use responsibly!',
    imgSrc: 'setup-agent-agents.fun-2',
  },
  {
    title: 'Engage with the X community',
    desc: 'Your agent will connect with users and other agents on X, responding, liking, and quoting their posts.',
    imgSrc: 'setup-agent-agents.fun-3',
  },
] as const;

export const MODIUS_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Your AI portfolio manager',
    desc: 'Modius collects real-time market data from CoinGecko and autonomously manages your investments using Balancer and Sturdy — delivering hands-free portfolio growth. Requires ETH and USDC on Mode as initial investments.',
    imgSrc: 'setup-agent-modius-1',
  },
  {
    title: 'Choose the best strategy',
    desc: 'Modius learns autonomously, adapts to changing market conditions, and selects the best next strategy to invest on your behalf.',
    imgSrc: 'setup-agent-modius-2',
  },
  // {
  //   title: 'Take action',
  //   desc: 'Based on its analysis and real-time market data, your Modius agent decides when its more convenient to buy, sell, or hold specific assets.',
  //   imgSrc: 'setup-agent-modius-3',
  // },
] as const;
