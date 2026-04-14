import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";

import { REACT_QUERY_KEYS } from "@/constants";
import { OnlineStatusContext } from "@/context/OnlineStatusProvider";
import { BackupWalletService } from "@/service/BackupWalletService";

import { usePageState } from "./usePageState";

export const useBackupOwnerStatus = () => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { isUserLoggedIn } = usePageState();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: REACT_QUERY_KEYS.BACKUP_OWNER_STATUS_KEY,
    queryFn: BackupWalletService.getBackupOwnerStatus,
    enabled: isOnline && isUserLoggedIn,
  });

  return { backupOwnerStatus: data, isLoading, isError, refetch };
};
