import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

import { AccountService } from '@/service/Account';
import { getErrorMessage } from '@/utils';

export const useValidatePassword = () => {
  const { isPending, isSuccess, isError, mutateAsync } = useMutation({
    mutationFn: async (password: string) =>
      await AccountService.loginAccount(password),
  });

  const validatePassword = useCallback(
    async (password: string) => {
      try {
        await mutateAsync(password);
        return true;
      } catch (e) {
        console.error(getErrorMessage(e));
        return false;
      }
    },
    [mutateAsync],
  );

  return { isLoading: isPending, isSuccess, isError, validatePassword };
};
