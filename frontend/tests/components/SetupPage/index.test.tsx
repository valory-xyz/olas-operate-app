import { render, screen } from '@testing-library/react';
import { createElement, ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------
import { Setup } from '../../../components/SetupPage/index';
import { SETUP_SCREEN, SetupScreen } from '../../../constants/setupScreen';
import { SetupContext } from '../../../context/SetupProvider';

// ---------------------------------------------------------------------------
// Module mocks — stub every child component
// ---------------------------------------------------------------------------

jest.mock('../../../components/SetupPage/SetupWelcome', () => ({
  SetupWelcome: () => <div data-testid="setup-welcome" />,
}));

jest.mock('../../../components/SetupPage/Create/SetupPassword', () => ({
  SetupPassword: () => <div data-testid="setup-password" />,
}));

jest.mock('../../../components/SetupPage/Create/SetupBackupSigner', () => ({
  SetupBackupSigner: () => <div data-testid="setup-backup-signer" />,
}));

jest.mock(
  '../../../components/SetupPage/AgentOnboarding/AgentOnboarding',
  () => ({
    AgentOnboarding: () => <div data-testid="agent-onboarding" />,
  }),
);

jest.mock(
  '../../../components/SetupPage/SetupYourAgent/SetupYourAgent',
  () => ({
    SetupYourAgent: () => <div data-testid="setup-your-agent" />,
  }),
);

jest.mock('../../../components/SelectStakingPage', () => ({
  SelectStakingPage: ({ mode }: { mode: string }) => (
    <div data-testid="select-staking-page" data-mode={mode} />
  ),
}));

jest.mock(
  '../../../components/SetupPage/FundYourAgent/components/BalanceCheck',
  () => ({
    BalanceCheck: () => <div data-testid="balance-check" />,
  }),
);

jest.mock(
  '../../../components/SetupPage/FundYourAgent/components/ConfirmFunding',
  () => ({
    ConfirmFunding: () => <div data-testid="confirm-funding" />,
  }),
);

jest.mock('../../../components/SetupPage/FundYourAgent/FundYourAgent', () => ({
  FundYourAgent: () => <div data-testid="fund-your-agent" />,
}));

jest.mock('../../../components/SetupPage/FundYourAgent/TransferFunds', () => ({
  TransferFunds: () => <div data-testid="transfer-funds" />,
}));

jest.mock(
  '../../../components/SetupPage/Create/SetupBridgeOnboarding/SetupBridgeOnboarding',
  () => ({
    SetupBridgeOnboarding: () => <div data-testid="setup-bridge-onboarding" />,
  }),
);

jest.mock(
  '../../../components/SetupPage/Create/SetupOnRamp/SetupOnRamp',
  () => ({
    SetupOnRamp: () => <div data-testid="setup-on-ramp" />,
  }),
);

jest.mock('../../../components/SetupPage/EarlyAccessOnly', () => ({
  EarlyAccessOnly: () => <div data-testid="early-access-only" />,
}));

jest.mock('../../../components/AccountRecovery', () => ({
  AccountRecovery: () => <div data-testid="account-recovery" />,
}));

jest.mock('../../../components/SetupPage/SupportButton', () => ({
  SupportButton: () => <div data-testid="support-button" />,
}));

jest.mock('../../../components/ui/CardFlex', () => ({
  CardFlex: ({ children }: { children?: ReactNode }) =>
    createElement('div', { 'data-testid': 'card-flex' }, children),
}));

// Mock styled-components so SetupCard renders as a detectable div.
// Uses a custom mock (not the shared helper) because these tests
// need data-testid="setup-card" to assert card-vs-Fragment wrapping.
jest.mock('styled-components', () => {
  function StyledDiv(props: { children?: ReactNode }) {
    return createElement(
      'div',
      { 'data-testid': 'setup-card' },
      props.children,
    );
  }
  const tagged = () => StyledDiv;
  tagged.withConfig = () => tagged;
  tagged.attrs = () => tagged;
  const handler: ProxyHandler<typeof tagged> = {
    get: () => tagged,
    apply: () => tagged,
  };
  return {
    __esModule: true,
    default: new Proxy(tagged, handler),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderWithState = (state: SetupScreen | string) => {
  return render(
    <SetupContext.Provider
      value={{
        setupObject: {
          state: state as SetupScreen,
          prevState: null,
        },
        setSetupObject: jest.fn(),
      }}
    >
      <Setup />
    </SetupContext.Provider>,
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Setup (SetupPage entry)', () => {
  describe('screen routing', () => {
    const screenTestCases: {
      screenKey: string;
      state: SetupScreen;
      expectedTestId: string;
    }[] = [
      {
        screenKey: 'Welcome',
        state: SETUP_SCREEN.Welcome,
        expectedTestId: 'setup-welcome',
      },
      {
        screenKey: 'SetupPassword',
        state: SETUP_SCREEN.SetupPassword,
        expectedTestId: 'setup-password',
      },
      {
        screenKey: 'SetupBackupSigner',
        state: SETUP_SCREEN.SetupBackupSigner,
        expectedTestId: 'setup-backup-signer',
      },
      {
        screenKey: 'AgentOnboarding',
        state: SETUP_SCREEN.AgentOnboarding,
        expectedTestId: 'agent-onboarding',
      },
      {
        screenKey: 'SetupYourAgent',
        state: SETUP_SCREEN.SetupYourAgent,
        expectedTestId: 'setup-your-agent',
      },
      {
        screenKey: 'SelectStaking',
        state: SETUP_SCREEN.SelectStaking,
        expectedTestId: 'select-staking-page',
      },
      {
        screenKey: 'BalanceCheck',
        state: SETUP_SCREEN.BalanceCheck,
        expectedTestId: 'balance-check',
      },
      {
        screenKey: 'FundYourAgent',
        state: SETUP_SCREEN.FundYourAgent,
        expectedTestId: 'fund-your-agent',
      },
      {
        screenKey: 'ConfirmFunding',
        state: SETUP_SCREEN.ConfirmFunding,
        expectedTestId: 'confirm-funding',
      },
      {
        screenKey: 'TransferFunds',
        state: SETUP_SCREEN.TransferFunds,
        expectedTestId: 'transfer-funds',
      },
      {
        screenKey: 'SetupBridgeOnboardingScreen',
        state: SETUP_SCREEN.SetupBridgeOnboardingScreen,
        expectedTestId: 'setup-bridge-onboarding',
      },
      {
        screenKey: 'SetupOnRamp',
        state: SETUP_SCREEN.SetupOnRamp,
        expectedTestId: 'setup-on-ramp',
      },
      {
        screenKey: 'EarlyAccessOnly',
        state: SETUP_SCREEN.EarlyAccessOnly,
        expectedTestId: 'early-access-only',
      },
      {
        screenKey: 'AccountRecovery',
        state: SETUP_SCREEN.AccountRecovery,
        expectedTestId: 'account-recovery',
      },
    ];

    it.each(screenTestCases)(
      'renders the correct component for $screenKey',
      ({ state, expectedTestId }) => {
        renderWithState(state);
        expect(screen.getByTestId(expectedTestId)).toBeInTheDocument();
      },
    );

    it('renders UnexpectedError for an unknown screen state', () => {
      renderWithState('UnknownScreen');
      expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
    });
  });

  describe('SelectStaking mode prop', () => {
    it('passes mode="onboard" to SelectStakingPage', () => {
      renderWithState(SETUP_SCREEN.SelectStaking);
      const el = screen.getByTestId('select-staking-page');
      expect(el).toHaveAttribute('data-mode', 'onboard');
    });
  });

  describe('SupportButton', () => {
    it('is always rendered regardless of screen state', () => {
      renderWithState(SETUP_SCREEN.Welcome);
      expect(screen.getByTestId('support-button')).toBeInTheDocument();
    });

    it('is rendered for screens without cards', () => {
      renderWithState(SETUP_SCREEN.AgentOnboarding);
      expect(screen.getByTestId('support-button')).toBeInTheDocument();
    });

    it('is rendered for default/error screen', () => {
      renderWithState('SomeUnknownState');
      expect(screen.getByTestId('support-button')).toBeInTheDocument();
    });
  });

  describe('SetupCard wrapper vs React.Fragment', () => {
    const screensWithCard: {
      screenKey: string;
      state: SetupScreen;
    }[] = [
      { screenKey: 'Welcome', state: SETUP_SCREEN.Welcome },
      { screenKey: 'SetupPassword', state: SETUP_SCREEN.SetupPassword },
      {
        screenKey: 'SetupBackupSigner',
        state: SETUP_SCREEN.SetupBackupSigner,
      },
      { screenKey: 'EarlyAccessOnly', state: SETUP_SCREEN.EarlyAccessOnly },
    ];

    const screensWithoutCard: {
      screenKey: string;
      state: SetupScreen;
    }[] = [
      { screenKey: 'AgentOnboarding', state: SETUP_SCREEN.AgentOnboarding },
      { screenKey: 'SetupYourAgent', state: SETUP_SCREEN.SetupYourAgent },
      { screenKey: 'BalanceCheck', state: SETUP_SCREEN.BalanceCheck },
      { screenKey: 'FundYourAgent', state: SETUP_SCREEN.FundYourAgent },
      { screenKey: 'ConfirmFunding', state: SETUP_SCREEN.ConfirmFunding },
      { screenKey: 'TransferFunds', state: SETUP_SCREEN.TransferFunds },
      {
        screenKey: 'SetupBridgeOnboardingScreen',
        state: SETUP_SCREEN.SetupBridgeOnboardingScreen,
      },
      { screenKey: 'SetupOnRamp', state: SETUP_SCREEN.SetupOnRamp },
      { screenKey: 'SelectStaking', state: SETUP_SCREEN.SelectStaking },
      { screenKey: 'AccountRecovery', state: SETUP_SCREEN.AccountRecovery },
    ];

    it.each(screensWithCard)(
      '$screenKey is wrapped with SetupCard',
      ({ state }) => {
        renderWithState(state);
        expect(screen.getByTestId('setup-card')).toBeInTheDocument();
      },
    );

    it.each(screensWithoutCard)(
      '$screenKey is NOT wrapped with SetupCard (uses Fragment)',
      ({ state }) => {
        renderWithState(state);
        expect(screen.queryByTestId('setup-card')).not.toBeInTheDocument();
      },
    );

    it('default/error screen is wrapped with SetupCard', () => {
      renderWithState('UnknownScreen');
      expect(screen.getByTestId('setup-card')).toBeInTheDocument();
    });
  });
});
