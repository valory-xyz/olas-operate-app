import { useCallback, useState } from 'react';

import { useElectronApi } from '@/hooks/useElectronApi';

import {
  validateGeminiApiKey,
  validateTwitterCredentials,
} from '../SetupYourAgent/validations';

type ValidationStatus = 'valid' | 'invalid' | 'unknown';

type FieldValues = {
  personaDescription: string;
  geminiApiKey: string;
  fireworksApiKey: string;
  xEmail: string;
  xUsername: string;
  xPassword: string;
};

export const useMemeFormValidate = () => {
  const electronApi = useElectronApi();

  const [isValidating, setIsValidating] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState('Continue');
  const [geminiApiKeyValidationStatus, setGeminiApiKeyValidationStatus] =
    useState<ValidationStatus>('unknown');
  const [
    twitterCredentialsValidationStatus,
    setTwitterCredentialsValidationStatus,
  ] = useState<ValidationStatus>('unknown');
  const [fireworksApiKeyValidationStatus, setFireworksApiKeyValidationStatus] =
    useState<ValidationStatus>('unknown');

  const handleValidate = useCallback(
    async (values: Record<keyof FieldValues, string>) => {
      setIsValidating(true);

      setGeminiApiKeyValidationStatus('unknown');
      setFireworksApiKeyValidationStatus('unknown');
      setTwitterCredentialsValidationStatus('unknown');
      setSubmitButtonText('Validating Gemini API key...');

      try {
        const isGeminiApiValid = await validateGeminiApiKey(
          values.geminiApiKey,
        );
        setGeminiApiKeyValidationStatus(isGeminiApiValid ? 'valid' : 'invalid');
        if (!isGeminiApiValid) return;

        const isFireworksApiValid = await validateGeminiApiKey(
          values.fireworksApiKey,
        );
        setGeminiApiKeyValidationStatus(
          isFireworksApiValid ? 'valid' : 'invalid',
        );
        if (!isFireworksApiValid) return;

        // validate the twitter credentials
        setSubmitButtonText('Validating Twitter credentials...');
        const { isValid: isTwitterCredentialsValid, cookies } =
          electronApi?.validateTwitterLogin
            ? await validateTwitterCredentials(
                values.xEmail,
                values.xUsername,
                values.xPassword,
                electronApi.validateTwitterLogin,
              )
            : { isValid: false, cookies: undefined };
        setTwitterCredentialsValidationStatus(
          isTwitterCredentialsValid ? 'valid' : 'invalid',
        );
        if (!isTwitterCredentialsValid) return;
        if (!cookies) return;

        // wait for agent setup to complete
        setSubmitButtonText('Setting up agent...');

        return cookies;
      } catch (error) {
        console.error('Error validating meme form:', error);
      } finally {
        setIsValidating(false);
      }
    },
    [electronApi.validateTwitterLogin],
  );

  return {
    isValidating,
    submitButtonText,
    setSubmitButtonText,
    geminiApiKeyValidationStatus,
    setGeminiApiKeyValidationStatus,
    fireworksApiKeyValidationStatus,
    setFireworksApiKeyValidationStatus,
    twitterCredentialsValidationStatus,
    setTwitterCredentialsValidationStatus,
    handleValidate,
  };
};
