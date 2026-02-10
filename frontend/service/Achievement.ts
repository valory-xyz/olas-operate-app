import {
  BACKEND_URL_V2,
  CONTENT_TYPE_JSON_UTF8,
  PEARL_API_URL,
} from '@/constants';
import { ServiceAchievements } from '@/types/Achievement';

type GetServiceAchievementsParams = {
  serviceConfigId: string;
  signal: AbortSignal;
};

/**
 * Function to fetch all "not_acknowledged" achievements associated with a particular service
 */
const getServiceAchievements = ({
  serviceConfigId,
  signal,
}: GetServiceAchievementsParams): Promise<ServiceAchievements> => {
  return fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}/achievements`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(
      `Failed to fetch service achievements for service config ${serviceConfigId}`,
    );
  });
};

type AcknowledgeServiceAchievementParams = {
  serviceConfigId: string;
  achievementId: string;
};

/**
 * Function to acknowledge an achievement associated with a particular service
 */
const acknowledgeServiceAchievement = async ({
  serviceConfigId,
  achievementId,
}: AcknowledgeServiceAchievementParams) => {
  const response = await fetch(
    `${BACKEND_URL_V2}/service/${serviceConfigId}/achievement/${achievementId}/acknowledge`,
    {
      method: 'POST',
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to acknowledge service achievement for service config ${serviceConfigId}`,
    );
  }

  return response.json();
};

type GenerateAchievementImageParams = {
  agent: string; // TODO: Better types! ideally should be a union of all the agent types (not AgentType though)
  type: string;
  id: string;
};

/**
 * Function to trigger image generation for an achievement basis the agent & achievement type
 */
const generateAchievementImage = async ({
  agent,
  type,
  id,
}: GenerateAchievementImageParams) => {
  const queryParams = new URLSearchParams({
    agent,
    type,
    id,
  }).toString();

  const response = await fetch(
    `${PEARL_API_URL}/api/achievement/generate-image?${queryParams}`,
    {
      method: 'POST',
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to trigger achievement image generation');
  }

  return response.json();
};

export {
  acknowledgeServiceAchievement,
  generateAchievementImage,
  getServiceAchievements,
};
