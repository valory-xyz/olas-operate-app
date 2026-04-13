import { useQuery } from '@tanstack/react-query';

import { FIVE_MINUTE_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { BackupWalletService } from '@/service/BackupWalletService';

export const useBackupOwnerStatus = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: REACT_QUERY_KEYS.BACKUP_OWNER_STATUS_KEY,
    queryFn: BackupWalletService.getBackupOwnerStatus,
    refetchInterval: FIVE_MINUTE_INTERVAL,
  });

  return { backupOwnerStatus: data, isLoading, isError, refetch };
};
