import { OnboardingStep } from './IntroductionStep';

export const PREDICTION_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    desc: 'An autonomous AI agent that interacts with decentralized prediction markets — platforms where users trade on the outcomes of future events.',
  },
  {
    title: 'Market opportunity finder',
    desc: 'Prediction agents actively scan prediction markets to identify new opportunities for investment.',
    imgSrc: 'introduction/setup-agent-prediction-1',
  },
  {
    title: 'Place intelligent bets',
    desc: 'Uses AI to make predictions and place bets on events by analyzing market trends and real-time information.',
    imgSrc: 'introduction/setup-agent-prediction-2',
  },
  {
    title: 'Collect earnings',
    desc: 'It collects earnings on the go, as the results of the corresponding prediction markets are finalized.',
    imgSrc: 'introduction/setup-agent-prediction-3',
  },
] as const;

export const AGENTS_FUN_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    desc: 'An autonomous AI agent that acts as your influencer on X, creating content, engaging with audiences, and continuously refining its persona.',
  },
  {
    title: 'Your personal AI influencer',
    desc: 'Create a custom persona, and your agent will post autonomously on X, crafting engaging content to match the character you design',
    imgSrc: 'introduction/setup-agent-agents.fun-1',
  },
  {
    title: 'Engage with the X community',
    desc: 'Your agent will connect with users and other agents on X, responding, liking, and quoting their posts.',
    imgSrc: 'introduction/setup-agent-agents.fun-2',
  },
] as const;

export const MODIUS_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    desc: 'An autonomous AI agent designed to streamline your DeFi experience by intelligently managing your assets across the Superchain.',
  },
  {
    title: 'Your AI portfolio manager',
    desc: 'Modius collects real-time market data from CoinGecko and autonomously manages your investments using Balancer, Sturdy and Velodrome. Requires ETH and USDC on Mode as initial investments.',
    imgSrc: 'introduction/setup-agent-modius-1',
  },
  {
    title: 'Choose the best strategy',
    desc: 'Modius learns autonomously, adapts to changing market conditions, and selects the best next strategy to invest on your behalf.',
    imgSrc: 'introduction/setup-agent-modius-2',
  },
] as const;

export const OPTIMUS_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    desc: 'An autonomous AI agent that is designed to streamline your DeFi experience by intelligently managing your assets across the Superchain.',
  },
  {
    title: 'Your AI portfolio manager',
    desc: 'Optimus collects real-time market data from CoinGecko and autonomously manages your investments using Balancer, Sturdy and Uniswap. Requires ETH and USDC on Optimism as initial investments.',
    imgSrc: 'introduction/setup-agent-optimus-1',
  },
  {
    title: 'Choose the best strategy',
    desc: 'Optimus learns autonomously, adapts to changing market conditions, and selects the best next strategy to invest on your behalf.',
    imgSrc: 'introduction/setup-agent-optimus-2',
  },
  // {
  //   title: 'Take action',
  //   desc: 'Based on its analysis and real-time market data, your Optimus agent decides when its more convenient to buy, sell, or hold specific assets.',
  //   imgSrc: 'introduction/setup-agent-optimus-3',
  // },
] as const;

export const PETT_AI_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    desc: 'Pett.ai autonomous agent service for virtual pet management.',
  },
  {
    title: 'Your Autonomous AI Friend',
    desc: 'For many players, their PettBro feels too important to lose - but work, school, or holidays sometimes get in the way of daily care. With the PettBro Agent, your pet gets a 24/7 babysitter. It feeds, plays, and levels up your companion every 7 minutes, ensuring it thrives even while you sleep.',
    imgSrc: 'introduction/setup-agent-pettbro-1',
    styles: {
      imageHeight: 268,
    },
  },
  {
    title: 'Grow your pet',
    desc: 'Your PettBro Agent analyzes the entire game state and picks the winning path. It optimizes your pet’s growth to ensure it levels up faster than humanly possible.',
    imgSrc: 'introduction/setup-agent-pettbro-2',
    styles: {
      imageHeight: 202,
    },
  },
] as const;

// TODO: Add real onboarding steps when available
export const PREDICT_TRADER_POLYMARKET_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    desc: 'An autonomous AI agent that interacts with decentralized prediction markets — platforms where users trade on the outcomes of future events.',
  },
  {
    title: 'Market opportunity finder',
    desc: 'Prediction agents actively scan prediction markets to identify new opportunities for investment.',
    imgSrc: 'introduction/setup-agent-prediction-polymarket-1',
  },
  {
    title: 'Place intelligent bets',
    desc: 'Uses AI to make predictions and place bets on events by analyzing market trends and real-time information.',
    imgSrc: 'introduction/setup-agent-prediction-polymarket-2',
  },
  {
    title: 'Collect earnings',
    desc: 'It collects earnings on the go, as the results of the corresponding prediction markets are finalized.',
    imgSrc: 'introduction/setup-agent-prediction-polymarket-3',
  },
] as const;
