import { ServiceTemplate } from '@/client';
import { StakingProgramId } from '@/enums/StakingProgram';
import { ServicesService } from '@/service/Services';

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
  }) => Promise<{ success: boolean; cookies?: string }>,
): Promise<{ isValid: boolean; cookies?: string }> => {
  if (!email || !username || !password) return { isValid: false };

  try {
    const result = await validateTwitterLogin({
      username,
      password,
      email,
    });

    if (result.success) {
      return { isValid: true, cookies: JSON.stringify(result.cookies) };
    }

    console.error('Error validating Twitter credentials:', result);
    return { isValid: false };
  } catch (error) {
    console.error('Unexpected error validating Twitter credentials:', error);
    return { isValid: false };
  }
};

export const onDummyServiceCreation = async (
  stakingProgramId: StakingProgramId,
  serviceTemplateConfig: ServiceTemplate,
) => {
  await ServicesService.createService({
    serviceTemplate: serviceTemplateConfig,
    deploy: true,
    useMechMarketplace: true,
    stakingProgramId,
  });
};
