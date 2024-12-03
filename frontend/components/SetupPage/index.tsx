import { useContext, useMemo } from 'react';

import { SetupContext } from '@/context/SetupProvider';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';

import { AgentSelection } from '../AgentSelection';
import { SetupBackupSigner } from './Create/SetupBackupSigner';
import { SetupCreateSafe } from './Create/SetupCreateSafe';
import { SetupEoaFunding } from './Create/SetupEoaFunding';
import { SetupPassword } from './Create/SetupPassword';
import { SetupSeedPhrase } from './Create/SetupSeedPhrase';
import {
  SetupRestoreMain,
  SetupRestoreSetPassword,
  SetupRestoreViaBackup,
  SetupRestoreViaSeed,
} from './SetupRestore';
import { SetupWelcome } from './SetupWelcome';
import { SetupYourAgent } from './SetupYourAgent';

const UnexpectedError = () => (
  <div style={{ height: 400 }}>Something went wrong!</div>
);

export const Setup = () => {
  const { setupObject } = useContext(SetupContext);
  const { goto } = useSetup();

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
      case SetupScreen.AgentSelection:
        return (
          <AgentSelection
            onPrev={() => goto(SetupScreen.SetupBackupSigner)}
            onNext={() => goto(SetupScreen.SetupEoaFunding)}
          />
        );
      case SetupScreen.SetupYourAgent:
        return <SetupYourAgent />;

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
  }, [setupObject.state, goto]);

  return setupScreen;
};
