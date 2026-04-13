import { useMutation, useQueryClient } from '@tanstack/react-query';

import { REACT_QUERY_KEYS } from '@/constants';
import {
  ApplyBackupOwnerRequest,
  BackupWalletService,
} from '@/service/BackupWalletService';

export const useApplyBackupOwner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ApplyBackupOwnerRequest) =>
      BackupWalletService.applyBackupOwner(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: REACT_QUERY_KEYS.BACKUP_OWNER_STATUS_KEY,
      });
    },
  });
};
