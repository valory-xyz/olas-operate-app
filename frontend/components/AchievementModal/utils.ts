import { PREDICT_WEBSITE_URL } from '@/constants';

export const getPredictWebsiteAchievementUrl = (
  agent: 'omenstrat' | 'polystrat',
  params: URLSearchParams,
) =>
  new URL(
    `${PREDICT_WEBSITE_URL}/${agent}/achievement/?${params.toString()}`,
  ).toString();

export const generateXIntentUrl = (text: string, url: string) =>
  `https://twitter.com/intent/post?text=${encodeURIComponent(
    text,
  )}&url=${encodeURIComponent(url)}`;
