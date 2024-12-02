import { useContext, useMemo } from 'react';

import { SetupContext } from '@/context/SetupProvider';
import { SetupScreen } from '@/enums/SetupScreen';

import { SetupBackupSigner } from './Create/SetupBackupSigner';
import { SetupCreateSafe } from './Create/SetupCreateSafe';
import { SetupEoaFunding } from './Create/SetupEoaFunding';
import { SetupPassword } from './Create/SetupPassword';
import { SetupSeedPhrase } from './Create/SetupSeedPhrase';
import { SelectYourAgent } from './SelectYourAgent';
import {
  SetupRestoreMain,
  SetupRestoreSetPassword,
  SetupRestoreViaBackup,
  SetupRestoreViaSeed,
} from './SetupRestore';
import { SetupWelcome } from './SetupWelcome';

const UnexpectedError = () => (
  <div style={{ height: 400 }}>Something went wrong!</div>
);

export const Setup = () => {
  const { setupObject } = useContext(SetupContext);

  const setupScreen = useMemo(() => {
    switch (setupObject.state) {
      case SetupScreen.Welcome:
        return <SetupWelcome />;
      // Create account
      case SetupScreen.SetupPassword:
        return <SetupPassword />;
      case SetupScreen.SetupSeedPhrase:
        return <SetupSeedPhrase />;
      case SetupScreen.SetupBackupSigner:
        return <SetupBackupSigner />;
      case SetupScreen.SetupEoaFunding:
        return <SetupEoaFunding />;
      case SetupScreen.SetupEoaFundingIncomplete:
        return <SetupEoaFunding />;
      case SetupScreen.SetupCreateSafe:
        return <SetupCreateSafe />;
      case SetupScreen.SelectYourAgent:
        return <SelectYourAgent />;
      // Restore account
      case SetupScreen.Restore:
        return <SetupRestoreMain />;
      case SetupScreen.RestoreViaSeed:
        return <SetupRestoreViaSeed />;
      case SetupScreen.RestoreSetPassword:
        return <SetupRestoreSetPassword />;
      case SetupScreen.RestoreViaBackup:
        return <SetupRestoreViaBackup />;
      default:
        return <UnexpectedError />;
    }
  }, [setupObject.state]);

  return setupScreen;
};
