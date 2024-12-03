import { delayInSeconds } from '@/utils/delay';

export const validateGeminiApiKey = async (apiKey: string) => {
  if (!apiKey) return false;

  try {
    const apiUrl =
      'https://generativelanguage.googleapis.com/v1/models?key=' + apiKey;

    const response = await fetch(apiUrl);
    window.console.log(response);

    if (!response.ok) {
      throw new Error('API request failed');
    }

    window.console.log('API key is valid');
    window.console.log(response.json());
    return true;
  } catch (error) {
    window.console.error('Error validating Gemini API key:', error);
    return false;
  }

  // TODO: validate the gemini API and remove the delay
  // await delayInSeconds(2);
  // return true;
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
