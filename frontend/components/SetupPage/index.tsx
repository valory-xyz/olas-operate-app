import { Typography } from 'antd';
import React, { useContext, useMemo } from 'react';

import { SETUP_SCREEN, SetupScreen } from '@/constants';
import { SetupContext } from '@/context/SetupProvider';

import { AccountRecovery } from '../AccountRecovery';
import { SelectStakingPage } from '../SelectStakingPage';
import { CardFlex } from '../ui/CardFlex';
import { SetupCard } from '../ui/SetupCard';
import { AgentOnboarding } from './AgentOnboarding/AgentOnboarding';
import { SetupBackupSigner } from './Create/SetupBackupSigner';
import { SetupBridgeOnboarding } from './Create/SetupBridgeOnboarding/SetupBridgeOnboarding';
import { SetupOnRamp } from './Create/SetupOnRamp/SetupOnRamp';
import { SetupPassword } from './Create/SetupPassword';
import { EarlyAccessOnly } from './EarlyAccessOnly';
import { FundRecovery } from './FundRecovery';
import { BalanceCheck } from './FundYourAgent/components/BalanceCheck';
import { ConfirmFunding } from './FundYourAgent/components/ConfirmFunding';
import { FundYourAgent } from './FundYourAgent/FundYourAgent';
import { TransferFunds } from './FundYourAgent/TransferFunds';
import { MigrateOperateFolder } from './MigrateOperateFolder';
import { SetupWelcome } from './SetupWelcome';
import { SetupYourAgent } from './SetupYourAgent/SetupYourAgent';
import { SupportButton } from './SupportButton';

const { Title } = Typography;

const UnexpectedError = () => (
  <CardFlex style={{ height: 400, textAlign: 'center' }} $noBorder>
    <Title level={4} className="m-0">
      Something went wrong!
    </Title>
  </CardFlex>
);

export { SetupCard };

const SCREEN_WITHOUT_CARDS: SetupScreen[] = [
  SETUP_SCREEN.AgentOnboarding,
  SETUP_SCREEN.SetupYourAgent,
  SETUP_SCREEN.BalanceCheck,
  SETUP_SCREEN.FundYourAgent,
  SETUP_SCREEN.ConfirmFunding,
  SETUP_SCREEN.TransferFunds,
  SETUP_SCREEN.SetupBridgeOnboardingScreen,
  SETUP_SCREEN.SetupOnRamp,
  SETUP_SCREEN.SelectStaking,
  SETUP_SCREEN.AccountRecovery,
  SETUP_SCREEN.MigrateOperateFolder,
  SETUP_SCREEN.FundRecovery,
];

export const Setup = () => {
  const { setupObject } = useContext(SetupContext);

  const setupScreen = useMemo(() => {
    switch (setupObject.state) {
      case SETUP_SCREEN.Welcome:
        return <SetupWelcome />;
      case SETUP_SCREEN.SetupPassword:
        return <SetupPassword />;
      case SETUP_SCREEN.SetupBackupSigner:
        return <SetupBackupSigner />;
      case SETUP_SCREEN.AgentOnboarding:
        return <AgentOnboarding />;
      case SETUP_SCREEN.SetupYourAgent:
        return <SetupYourAgent />;
      case SETUP_SCREEN.SelectStaking:
        return <SelectStakingPage mode="onboard" />;
      case SETUP_SCREEN.BalanceCheck:
        return <BalanceCheck />;
      case SETUP_SCREEN.FundYourAgent:
        return <FundYourAgent />;
      case SETUP_SCREEN.ConfirmFunding:
        return <ConfirmFunding />;
      case SETUP_SCREEN.TransferFunds:
        return <TransferFunds />;
      case SETUP_SCREEN.SetupBridgeOnboardingScreen:
        return <SetupBridgeOnboarding />;
      case SETUP_SCREEN.SetupOnRamp:
        return <SetupOnRamp />;
      case SETUP_SCREEN.EarlyAccessOnly:
        return <EarlyAccessOnly />;
      case SETUP_SCREEN.AccountRecovery:
        return <AccountRecovery />;
      case SETUP_SCREEN.MigrateOperateFolder:
        return <MigrateOperateFolder />;
      case SETUP_SCREEN.FundRecovery:
        return <FundRecovery />;
      default:
        return <UnexpectedError />;
    }
  }, [setupObject.state]);

  let Wrapper: React.ElementType = SetupCard;
  if (SCREEN_WITHOUT_CARDS.includes(setupObject.state)) {
    Wrapper = React.Fragment;
  }

  return (
    <Wrapper>
      <SupportButton />
      {setupScreen}
    </Wrapper>
  );
};
