import { useCallback, useState } from 'react';

import {
  validateGeminiApiKey,
  ValidationStatus,
} from '../../../AgentForms/common/validations';

export type PredictFieldValues = {
  geminiApiKey?: string;
};

export const usePredictFormValidate = (
  defaultSubmitButtonText = 'Continue',
) => {
  const [isValidating, setIsValidating] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState(
    defaultSubmitButtonText,
  );
  const [geminiApiKeyValidationStatus, setGeminiApiKeyValidationStatus] =
    useState<ValidationStatus>('unknown');

  const handleValidate = useCallback(async (values: PredictFieldValues) => {
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
      console.error('Error validating predict form:', error);
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
