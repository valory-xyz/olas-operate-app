import { XCookie } from '@/types/Cookies';

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

const formatXCookies = (cookiesArray: XCookie[]) => {
  const cookiesObject: Record<string, string> = {};
  cookiesArray.forEach((cookie) => {
    cookiesObject[cookie.key] = cookie.value;
  });
  return JSON.stringify(cookiesObject);
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
  }) => Promise<{ success: boolean; cookies?: XCookie[] }>,
): Promise<{ isValid: boolean; cookies?: string }> => {
  if (!email || !username || !password) return { isValid: false };

  try {
    const result = await validateTwitterLogin({
      username,
      password,
      email,
    });

    if (result.success && result.cookies) {
      return { isValid: true, cookies: formatXCookies(result.cookies) };
    }

    console.error('Error validating Twitter credentials:', result);
    return { isValid: false };
  } catch (error) {
    console.error('Unexpected error validating Twitter credentials:', error);
    return { isValid: false };
  }
};
