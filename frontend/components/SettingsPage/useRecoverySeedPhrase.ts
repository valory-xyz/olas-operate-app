import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

import { WalletService } from '@/service/Wallet';
import { getErrorMessage } from '@/utils';

export const useRecoverySeedPhrase = () => {
  const { isPending, isSuccess, isError, mutateAsync } = useMutation({
    mutationFn: async (password: string) =>
      await WalletService.getRecoverySeedPhrase(password),
  });

  const getRecoverySeedPhrase = useCallback(
    async (password: string) => {
      try {
        return await mutateAsync(password);
      } catch (e) {
        console.error(getErrorMessage(e));
        return false;
      }
    },
    [mutateAsync],
  );

  return { isLoading: isPending, isSuccess, isError, getRecoverySeedPhrase };
};
