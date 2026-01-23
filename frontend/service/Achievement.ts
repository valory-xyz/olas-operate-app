import { compact } from 'lodash';

import {
  BACKEND_URL_V2,
  CONTENT_TYPE_JSON_UTF8,
  PEARL_API_URL,
} from '@/constants';
import {
  AllServicesAchievements,
  ServiceAchievements,
} from '@/types/Achievement';

type GetServiceAchievementsParams = {
  serviceConfigId: string;
  signal?: AbortSignal;
};

/**
 * Function to fetch all "not_acknowledged" achievements associated with a particular service
 */
const getServiceAchievements = ({
  serviceConfigId,
  signal,
}: GetServiceAchievementsParams): Promise<ServiceAchievements> => {
  return fetch(
    `${BACKEND_URL_V2}/api/v2/service/${serviceConfigId}/achievements`,
    {
      method: 'GET',
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
      signal,
    },
  ).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(
      `Failed to fetch service achievements for service config ${serviceConfigId}`,
    );
  });
};

type GetAllServicesAchievementsParams = {
  serviceConfigIds: string[];
  signal: AbortSignal;
};

/**
 * Function to fetch undelivered achievements for all the services in parallel
 */
const getAllServicesAchievements = async ({
  serviceConfigIds,
  signal,
}: GetAllServicesAchievementsParams): Promise<AllServicesAchievements> => {
  const promises = await Promise.allSettled(
    serviceConfigIds.map((serviceConfigId) =>
      getServiceAchievements({ serviceConfigId, signal }),
    ),
  );

  const validEntries = compact(
    promises.map((promise, index) =>
      promise.status === 'fulfilled'
        ? ([serviceConfigIds[index], promise.value] as const)
        : null,
    ),
  );

  return Object.fromEntries(validEntries);
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
    `${BACKEND_URL_V2}/api/v2/service/${serviceConfigId}/achievements/${achievementId}/acknowledge`,
    {
      method: 'POST',
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
      body: JSON.stringify({
        message: 'Achievement acknowledged',
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to acknowledge service achievement for service config ${serviceConfigId}`,
    );
  }

  return response.json();
};

type TriggerAchievementImageGenerationParams = {
  agent: string; // Better types! ideally should be a union of all the agent types (not AgentType though)
  type: string;
  id: string;
};

/**
 * Function to trigger image generation for an achievement basis the agent & achievement type
 */
const triggerAchievementImageGeneration = async ({
  agent,
  type,
  id,
}: TriggerAchievementImageGenerationParams) => {
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
  getAllServicesAchievements,
  triggerAchievementImageGeneration,
};
