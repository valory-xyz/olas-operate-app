// BISECT: All API calls stubbed to return empty data
import { ServiceAchievements } from '@/types/Achievement';

type GetServiceAchievementsParams = {
  serviceConfigId: string;
  signal: AbortSignal;
};

/**
 * BISECT: Stubbed to return empty achievements
 */
const getServiceAchievements = ({
  serviceConfigId: _serviceConfigId,
  signal: _signal,
}: GetServiceAchievementsParams): Promise<ServiceAchievements> => {
  return Promise.resolve([]);
};

type AcknowledgeServiceAchievementParams = {
  serviceConfigId: string;
  achievementId: string;
};

/**
 * BISECT: Stubbed to do nothing
 */
const acknowledgeServiceAchievement = async ({
  serviceConfigId: _serviceConfigId,
  achievementId: _achievementId,
}: AcknowledgeServiceAchievementParams) => {
  return Promise.resolve({});
};

type GenerateAchievementImageParams = {
  agent: string;
  type: string;
  id: string;
};

/**
 * BISECT: Stubbed to do nothing
 */
const generateAchievementImage = async ({
  agent: _agent,
  type: _type,
  id: _id,
}: GenerateAchievementImageParams) => {
  return Promise.resolve({});
};

export {
  acknowledgeServiceAchievement,
  generateAchievementImage,
  getServiceAchievements,
};
