import { delayInSeconds } from '@/utils/delay';

export const validateGeminiApiKey = async (apiKey: string) => {
  if (!apiKey) return false;

  try {
    // sample request to fetch the models
    const apiUrl =
      'https://generativelanguage.googleapis.com/v1/models?key=' + apiKey;
    const response = await fetch(apiUrl);

    return response.ok;
  } catch (error) {
    console.error('Error validating Gemini API key:', error);
    return false;
  }
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
