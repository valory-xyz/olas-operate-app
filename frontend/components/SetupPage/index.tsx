import { Typography } from 'antd';
import { useContext, useMemo } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { SetupContext } from '@/context/SetupProvider';
import { SetupScreen } from '@/enums/SetupScreen';

import { SelectStaking } from '../SelectStaking/SelectStaking';
import { CardFlex } from '../ui/CardFlex';
import { AgentOnboarding } from './AgentOnboarding/AgentOnboarding';
import { SetupBackupSigner } from './Create/SetupBackupSigner';
import { SetupBridgeOnboarding } from './Create/SetupBridgeOnboarding/SetupBridgeOnboarding';
import { SetupOnRamp } from './Create/SetupOnRamp/SetupOnRamp';
import { SetupPassword } from './Create/SetupPassword';
import { EarlyAccessOnly } from './EarlyAccessOnly';
import { FundYourAgent } from './FundYourAgent/FundYourAgent';
import { TransferFunds } from './FundYourAgent/TransferFunds';
import {
  SetupRestoreMain,
  SetupRestoreSetPassword,
  SetupRestoreViaBackup,
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

const SetupCard = styled.div`
  max-width: 516px;
  width: 100%;
  margin: auto;
  overflow: hidden;
  border-radius: 16px;
  background: ${COLOR.WHITE};
  box-shadow:
    0 74px 21px 0 rgba(170, 193, 203, 0),
    0 47px 19px 0 rgba(170, 193, 203, 0.01),
    0 26px 16px 0 rgba(170, 193, 203, 0.05),
    0 12px 12px 0 rgba(170, 193, 203, 0.09),
    0 3px 6px 0 rgba(170, 193, 203, 0.1);
`;

const screenWithoutCards: SetupScreen[] = [
  SetupScreen.AgentOnboarding,
  SetupScreen.SetupYourAgent,
  SetupScreen.FundYourAgent,
  SetupScreen.TransferFunds,
  SetupScreen.SetupBridgeOnboardingScreen,
  SetupScreen.SetupOnRamp,
  SetupScreen.SelectStaking,
];

export const Setup = () => {
  const { setupObject } = useContext(SetupContext);

  const setupScreen = useMemo(() => {
    switch (setupObject.state) {
      case SetupScreen.Welcome:
        return <SetupWelcome />;

      // Create account
      case SetupScreen.SetupPassword:
        return <SetupPassword />;
      case SetupScreen.SetupBackupSigner:
        return <SetupBackupSigner />;
      case SetupScreen.AgentOnboarding:
        return <AgentOnboarding />;
      case SetupScreen.SetupYourAgent:
        return <SetupYourAgent />;
      case SetupScreen.SelectStaking:
        return <SelectStaking mode="select" />;
      case SetupScreen.FundYourAgent:
        return <FundYourAgent />;
      case SetupScreen.TransferFunds:
        return <TransferFunds />;
      case SetupScreen.SetupBridgeOnboardingScreen:
        return <SetupBridgeOnboarding />;
      case SetupScreen.SetupOnRamp:
        return <SetupOnRamp />;
      case SetupScreen.EarlyAccessOnly:
        return <EarlyAccessOnly />;

      // Restore account, screens to be re-implemented as per v1
      case SetupScreen.Restore:
        return <SetupRestoreMain />;
      case SetupScreen.RestoreSetPassword:
        return <SetupRestoreSetPassword />;
      case SetupScreen.RestoreViaBackup:
        return <SetupRestoreViaBackup />;
      default:
        return <UnexpectedError />;
    }
  }, [setupObject.state]);

  if (screenWithoutCards.includes(setupObject.state)) {
    return setupScreen;
  }

  return <SetupCard>{setupScreen}</SetupCard>;
};
