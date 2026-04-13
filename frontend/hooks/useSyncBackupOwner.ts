import { useMutation, useQueryClient } from '@tanstack/react-query';

import { REACT_QUERY_KEYS } from '@/constants';
import { BackupWalletService } from '@/service/BackupWalletService';

export const useSyncBackupOwner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: BackupWalletService.syncBackupOwner,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: REACT_QUERY_KEYS.BACKUP_OWNER_STATUS_KEY,
      });
    },
  });
};
