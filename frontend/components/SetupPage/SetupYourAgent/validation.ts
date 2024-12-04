import { delayInSeconds } from '@/utils/delay';

/**
 * Validate the Google Gemini API key
 */
export const validateGeminiApiKey = async (apiKey: string) => {
  if (!apiKey) return false;

  try {
    // sample request to fetch the models
    // const apiUrl =
    //   'https://generativelanguage.googleapis.com/v1/models?key=' + apiKey;
    // const response = await fetch(apiUrl);

    // return response.ok;

    await delayInSeconds(1);
    return true;
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
  checkTwitterLogin: any,
) => {
  if (!email || !username || !password) return false;

  try {
    // const scraper = new Scraper({
    //   transform: {
    //     request(input: RequestInfo | URL, init?: RequestInit) {
    //       if (input instanceof URL) {
    //         const proxy =
    //           'https://corsproxy.io/?' + encodeURIComponent(input.toString());
    //         return [proxy, init];
    //       } else if (typeof input === 'string') {
    //         const proxy = 'https://corsproxy.io/?' + encodeURIComponent(input);
    //         return [proxy, init];
    //       } else {
    //         throw new Error('Unexpected request input type');
    //       }
    //     },
    //   },
    // });

    // const scraper = new Scraper();

    // console.log('Logging in with:', email, username, password, scraper);

    await checkTwitterLogin({ username, password, email });

    // Check if logged in
    // const isLoggedIn = await scraper.isLoggedIn();
    // return isLoggedIn;
  } catch (error) {
    console.error('Error validating Twitter credentials:', error);
    return false;
  }
};

export const onAgentSetupComplete = async () => {
  // TODO: send to backend and remove the delay
  await delayInSeconds(2);
};
