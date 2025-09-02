import { Typography } from 'antd';
import { useContext, useMemo } from 'react';

import { SetupContext } from '@/context/SetupProvider';
import { SetupScreen } from '@/enums/SetupScreen';

import { AgentSelection } from '../AgentSelection';
import { CardFlex } from '../styled/CardFlex';
import { AgentIntroduction } from './AgentIntroduction/AgentIntroduction';
import { SetupBackupSigner } from './Create/SetupBackupSigner';
import { SetupBridgeOnboarding } from './Create/SetupBridgeOnboarding/SetupBridgeOnboarding';
import { SetupCreateSafe } from './Create/SetupCreateSafe';
import { SetupEoaFunding } from './Create/SetupEoaFunding/SetupEoaFunding';
import { SetupOnRamp } from './Create/SetupOnRamp/SetupOnRamp';
import { SetupPassword } from './Create/SetupPassword';
import { SetupSeedPhrase } from './Create/SetupSeedPhrase';
import { EarlyAccessOnly } from './EarlyAccessOnly';
import {
  SetupRestoreMain,
  SetupRestoreSetPassword,
  SetupRestoreViaBackup,
  SetupRestoreViaSeed,
} from './SetupRestore';
import { SetupWelcome } from './SetupWelcome';
import { SetupYourAgent } from './SetupYourAgent/SetupYourAgent';

const { Title } = Typography;

const UnexpectedError = () => (
  <CardFlex style={{ height: 400, textAlign: 'center' }} $noBorder>
    <Title level={4} className="m-0">
      Something went wrong!
    </Title>
  </CardFlex>
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
      case SetupScreen.AgentSelection:
        return <AgentSelection showSelected={false} />;
      case SetupScreen.AgentIntroduction:
        return <AgentIntroduction />;
      case SetupScreen.EarlyAccessOnly:
        return <EarlyAccessOnly />;
      case SetupScreen.SetupYourAgent:
        return <SetupYourAgent />;

      // Bridge account
      case SetupScreen.SetupBridgeOnboardingScreen:
        return <SetupBridgeOnboarding />;

      // On Ramp
      case SetupScreen.SetupOnRamp:
        return <SetupOnRamp />;

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
