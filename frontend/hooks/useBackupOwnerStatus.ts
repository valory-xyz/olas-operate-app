import { useQuery } from '@tanstack/react-query';

import { REACT_QUERY_KEYS, THIRTY_SECONDS_INTERVAL } from '@/constants';
import { BackupWalletService } from '@/service/BackupWalletService';

export const useBackupOwnerStatus = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: REACT_QUERY_KEYS.BACKUP_OWNER_STATUS_KEY,
    queryFn: BackupWalletService.getBackupOwnerStatus,
    refetchInterval: THIRTY_SECONDS_INTERVAL,
  });

  return { backupOwnerStatus: data, isLoading, isError, refetch };
};
