import { render, screen } from '@testing-library/react';

import { SetupBridgeOnboarding } from '../../../../../components/SetupPage/Create/SetupBridgeOnboarding/SetupBridgeOnboarding';
import { EvmChainIdMap } from '../../../../../constants/chains';

jest.mock('../../../../../constants/providers', () => ({ PROVIDERS: {} }));

let mockIsGateOpen = true;

jest.mock('../../../../../components/SetupPage/BackupSignerGate', () => ({
  BackupSignerGate: ({
    children,
  }: {
    children: (signer: unknown) => React.ReactNode;
  }) =>
    mockIsGateOpen ? (
      children({ state: 'ready' })
    ) : (
      <div data-testid="gate-waiting" />
    ),
}));

jest.mock('../../../../../hooks', () => ({
  useGetBridgeRequirementsParams: () => jest.fn(),
  useServices: () => ({
    selectedAgentConfig: {
      middlewareHomeChainId: 'gnosis',
      evmHomeChainId: EvmChainIdMap.Gnosis,
    },
    selectedAgentType: 'trader',
  }),
  useSetup: () => ({ goto: jest.fn(), prevState: undefined }),
}));

jest.mock('../../../../../components/Bridge', () => ({
  Bridge: () => <div data-testid="bridge" />,
}));

jest.mock('../../../../../components/ui', () => ({
  AgentSetupCompleteModal: () => null,
}));

describe('SetupBridgeOnboarding', () => {
  afterEach(() => {
    mockIsGateOpen = true;
  });

  it('renders the bridge inside the backup signer gate', () => {
    render(<SetupBridgeOnboarding />);
    expect(screen.getByTestId('bridge')).toBeInTheDocument();
  });

  it('does not open the bridge (which creates the Pearl Safe) until the gate opens', () => {
    mockIsGateOpen = false;
    render(<SetupBridgeOnboarding />);
    expect(screen.queryByTestId('bridge')).not.toBeInTheDocument();
    expect(screen.getByTestId('gate-waiting')).toBeInTheDocument();
  });
});
