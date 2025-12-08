import { Typography } from 'antd';
import React, { useContext, useMemo } from 'react';
import styled from 'styled-components';

import { COLOR, SETUP_SCREEN, SetupScreen } from '@/constants';
import { SetupContext } from '@/context/SetupProvider';

import { AccountRecovery } from '../AccountRecovery';
import { SelectStakingPage } from '../SelectStakingPage';
import { CardFlex } from '../ui/CardFlex';
import { AgentOnboarding } from './AgentOnboarding/AgentOnboarding';
import { SetupBackupSigner } from './Create/SetupBackupSigner';
import { SetupBridgeOnboarding } from './Create/SetupBridgeOnboarding/SetupBridgeOnboarding';
import { SetupOnRamp } from './Create/SetupOnRamp/SetupOnRamp';
import { SetupPassword } from './Create/SetupPassword';
import { EarlyAccessOnly } from './EarlyAccessOnly';
import { FundYourAgent } from './FundYourAgent/FundYourAgent';
import { TransferFunds } from './FundYourAgent/TransferFunds';
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

const SCREEN_WITHOUT_CARDS: SetupScreen[] = [
  SETUP_SCREEN.AgentOnboarding,
  SETUP_SCREEN.SetupYourAgent,
  SETUP_SCREEN.FundYourAgent,
  SETUP_SCREEN.TransferFunds,
  SETUP_SCREEN.SetupBridgeOnboardingScreen,
  SETUP_SCREEN.SetupOnRamp,
  SETUP_SCREEN.SelectStaking,
  SETUP_SCREEN.AccountRecovery,
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
      case SETUP_SCREEN.FundYourAgent:
        return <FundYourAgent />;
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
