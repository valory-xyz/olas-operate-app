import { AgentMap, AgentType } from '@/constants';

const PREDICTION_QUESTIONS = [
  'What can you do?',
  'Why did you place your last trade?',
  "What's my current configuration?",
  "What's my daily activity target?",
];

const DEFI_QUESTIONS = [
  'What can you do?',
  'Why did you choose your current pool?',
  "What's my current configuration?",
  "What's my daily activity target?",
];

export const SUGGESTED_QUESTIONS: Partial<Record<AgentType, string[]>> = {
  [AgentMap.PredictTrader]: PREDICTION_QUESTIONS,
  [AgentMap.Polystrat]: PREDICTION_QUESTIONS,
  [AgentMap.Optimus]: DEFI_QUESTIONS,
  [AgentMap.Basius]: DEFI_QUESTIONS,
};

export const CHAT_COPY = {
  placeholder: 'Ask your agent or give it guidance...',
  emptyTitle: 'Ask your agent anything',
  messagesOnly: 'Messages only',
  busy: 'Your agent is still thinking. Send your message after it answers.',
  failed: "Couldn't get an answer.",
  noFunds: 'Not enough funds to send this message.',
  tryAgain: 'Try again',
  dismiss: 'Dismiss',
  startToChat: 'Start the agent to chat',
  thinking: 'Thinking...',
  stillThinking: 'Still thinking...',
  standby: 'Standby until the next epoch',
  loading: 'Agent is loading',
  notRunning: 'Agent is not running',
  running: 'Agent is running',
  activityRewards: 'Activity rewards',
  dailyActivityTarget: 'Daily activity target',
  earned: 'earned',
  notEarned: 'not earned yet',
  reached: 'reached',
  notReached: 'not reached yet',
  targetHint: 'To see or change the target, ask your agent.',
  feedError: "Couldn't load the agent's activity.",
  olderError: "Couldn't load earlier activity.",
} as const;
