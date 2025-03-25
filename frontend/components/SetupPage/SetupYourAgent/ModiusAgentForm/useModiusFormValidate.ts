import { useCallback, useState } from 'react';

import { validateGeminiApiKey, ValidationStatus } from '../shared/validations';

export type FieldValues = {
  tenderlyAccessToken: string;
  tenderlyAccountSlug: string;
  tenderlyProjectSlug: string;
  CoinGeckoApiKey: string;
  geminiApiKey: string;
};

export const useModiusFormValidate = (btnText = 'Continue') => {
  const [isValidating, setIsValidating] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState(btnText);
  const [geminiApiKeyValidationStatus, setGeminiApiKeyValidationStatus] =
    useState<ValidationStatus>('unknown');

  const handleValidate = useCallback(
    async (values: Record<keyof FieldValues, string>) => {
      setIsValidating(true);

      setGeminiApiKeyValidationStatus('unknown');
      setSubmitButtonText('Validating...');

      try {
        const isGeminiApiKeyProvided = !!values.geminiApiKey;

        // gemini api key is optional, so we only validate if it's provided
        if (isGeminiApiKeyProvided) {
          const isGeminiApiValid = await validateGeminiApiKey(
            values.geminiApiKey,
          );
          setGeminiApiKeyValidationStatus(
            isGeminiApiValid ? 'valid' : 'invalid',
          );
          if (!isGeminiApiValid) return;
        }

        return true;
      } catch (error) {
        console.error('Error validating meme form:', error);
      } finally {
        setIsValidating(false);
      }
    },
    [],
  );

  const updateSubmitButtonText = useCallback((value: string) => {
    setSubmitButtonText(value);
  }, []);

  return {
    isValidating,
    geminiApiKeyValidationStatus,
    submitButtonText,
    updateSubmitButtonText,
    validateForm: handleValidate,
  };
};
