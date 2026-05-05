import { type AchievementAgent, PREDICT_WEBSITE_URL } from '@/constants';

export const getPredictWebsiteAchievementUrl = (
  agent: AchievementAgent,
  params: URLSearchParams,
) =>
  new URL(
    `${PREDICT_WEBSITE_URL}/${agent}/achievement/?${params.toString()}`,
  ).toString();

export const generateXIntentUrl = (text: string) =>
  `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
