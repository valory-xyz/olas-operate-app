export type ValidationStatus = 'valid' | 'invalid' | 'unknown';

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
