import { delayInSeconds } from '@/utils/delay';

/**
 * Validate the Google Gemini API key
 */
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

/**
 * Validate the Twitter credentials
 */
export const validateTwitterCredentials = async (
  email: string,
  username: string,
  password: string,
  validateTwitterLogin: ({
    username,
    password,
    email,
  }: {
    email: string;
    username: string;
    password: string;
  }) => Promise<{ success: boolean }>,
) => {
  if (!email || !username || !password) return false;

  try {
    const isValidated = await validateTwitterLogin({
      username,
      password,
      email,
    });
    if (isValidated.success) {
      return true;
    }

    console.error('Error validating Twitter credentials:', isValidated);
    return false;
  } catch (error) {
    console.error('Unexpected error validating Twitter credentials:', error);
    return false;
  }
};

export const onAgentSetupComplete = async () => {
  // TODO: send to backend and remove the delay
  await delayInSeconds(2);
};
