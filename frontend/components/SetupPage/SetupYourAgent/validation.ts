import { delayInSeconds } from '@/utils/delay';

export const validateGeminiApiKey = async (value: string) => {
  if (!value) return false;

  // TODO: validate the gemini API and remove the delay
  await delayInSeconds(2);

  return true;
};

export const validateTwitterCredentials = async (
  email: string,
  username: string,
  password: string,
) => {
  if (!email || !username || !password) return false;

  // TODO: validate the twitter credentials and remove the delay
  await delayInSeconds(2);

  return false;
};

export const onAgentSetupComplete = async () => {
  // TODO: send to backend and remove the delay
  await delayInSeconds(2);
};
