import { useCallback, useState } from 'react';

import {
  validateGeminiApiKey,
  ValidationStatus,
} from '../../../AgentForms/common/validations';

export type ModiusFieldValues = {
  tenderlyAccessToken: string;
  tenderlyAccountSlug: string;
  tenderlyProjectSlug: string;
  coinGeckoApiKey: string;
  geminiApiKey?: string;
};

export const useModiusFormValidate = (defaultSubmitButtonText = 'Continue') => {
  const [isValidating, setIsValidating] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState(
    defaultSubmitButtonText,
  );
  const [geminiApiKeyValidationStatus, setGeminiApiKeyValidationStatus] =
    useState<ValidationStatus>('unknown');

  const handleValidate = useCallback(async (values: ModiusFieldValues) => {
    setIsValidating(true);

    setGeminiApiKeyValidationStatus('unknown');
    setSubmitButtonText('Validating...');

    try {
      // gemini api key is optional, so we only validate if it's provided
      if (values.geminiApiKey) {
        const isGeminiApiValid = await validateGeminiApiKey(
          values.geminiApiKey,
        );
        setGeminiApiKeyValidationStatus(isGeminiApiValid ? 'valid' : 'invalid');
        if (!isGeminiApiValid) return;
      }

      return true;
    } catch (error) {
      console.error('Error validating modius form:', error);
    } finally {
      setIsValidating(false);
    }
  }, []);

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
