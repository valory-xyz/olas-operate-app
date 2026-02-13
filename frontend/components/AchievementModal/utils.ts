import { PREDICT_WEBSITE_URL } from '@/constants';

// TODO: Use AgentType
export const getPredictWebsiteAchievementUrl = (
  agent: 'omenstrat' | 'polystrat',
  params: URLSearchParams,
) =>
  new URL(
    `${PREDICT_WEBSITE_URL}/${agent}/achievement/?${params.toString()}`,
  ).toString();

export const generateXIntentUrl = (text: string) =>
  `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
