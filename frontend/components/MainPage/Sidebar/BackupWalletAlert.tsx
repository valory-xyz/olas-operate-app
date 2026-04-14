import { LuWallet } from "react-icons/lu";
import { useBoolean } from "usehooks-ts";

import { SyncBackupWalletModal } from "@/components/SettingsPage/BackupWallet/SyncBackupWalletModal";
import { Alert } from "@/components/ui";
import { PAGES } from "@/constants";
import { useBackupOwnerStatus, usePageState } from "@/hooks";

export const BackupWalletAlert = () => {
  const { goto: gotoPage } = usePageState();
  const { backupOwnerStatus } = useBackupOwnerStatus();
  const {
    value: isSyncOpen,
    setTrue: openSync,
    setFalse: closeSync,
  } = useBoolean(false);

  const canonicalAddress = backupOwnerStatus?.canonical_backup_owner ?? null;
  const allChainsSynced = backupOwnerStatus?.all_chains_synced ?? true;
  const anyBackupMissing = backupOwnerStatus?.any_backup_missing ?? false;

  if (!anyBackupMissing && allChainsSynced) return null;

  const isAddAlert = canonicalAddress === null;

  if (isAddAlert) {
    return (
      <Alert
        type="warning"
        message="Add backup wallet"
        onClick={() => gotoPage(PAGES.Settings)}
        showIcon
        customIcon={<LuWallet />}
        className="mt-auto mb-16"
        style={{ alignItems: "center", cursor: "pointer" }}
      />
    );
  }

  return (
    <>
      <Alert
        type="warning"
        message="Sync backup wallet"
        onClick={openSync}
        showIcon
        customIcon={<LuWallet />}
        className="mt-auto mb-16"
        style={{ alignItems: "center", cursor: "pointer" }}
      />
      <SyncBackupWalletModal open={isSyncOpen} onClose={closeSync} />
    </>
  );
};
