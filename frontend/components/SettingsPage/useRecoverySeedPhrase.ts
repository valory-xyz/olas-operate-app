import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { WalletService } from '@/service/Wallet';
import { getErrorMessage } from '@/utils';

export const useRecoverySeedPhrase = () => {
  const { isPending, isSuccess, isError, error, mutateAsync } = useMutation({
    mutationFn: async (password: string) =>
      await WalletService.getRecoverySeedPhrase(password),
  });

  const getRecoverySeedPhrase = useCallback(
    async (password: string) => {
      return await mutateAsync(password);
    },
    [mutateAsync],
  );

  const errorMessage = useMemo(() => {
    if (!isError) return null;
    const defaultMessage =
      'Failed to retrieve recovery phrase. Please try again later.';
    return getErrorMessage(error, defaultMessage);
  }, [isError, error]);

  return {
    isLoading: isPending,
    isSuccess,
    isError,
    getRecoverySeedPhrase,
    errorMessage,
  };
};
