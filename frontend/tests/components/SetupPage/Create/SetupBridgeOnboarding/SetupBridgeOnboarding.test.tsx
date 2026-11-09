import { fireEvent, render, screen } from '@testing-library/react';

import { SetupBridgeOnboarding } from '../../../../../components/SetupPage/Create/SetupBridgeOnboarding/SetupBridgeOnboarding';
import { EvmChainIdMap } from '../../../../../constants/chains';
import { SETUP_SCREEN } from '../../../../../constants/setupScreen';

jest.mock('../../../../../constants/providers', () => ({ PROVIDERS: {} }));

let mockIsGateOpen = true;
const mockGotoSetup = jest.fn();

jest.mock('../../../../../components/SetupPage/BackupSignerGate', () => ({
  BackupSignerGate: ({
    children,
    onBack,
  }: {
    children: (signer: unknown) => React.ReactNode;
    onBack: () => void;
  }) =>
    mockIsGateOpen ? (
      children({ state: 'ready' })
    ) : (
      <button data-testid="gate-waiting" onClick={onBack} />
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
  useSetup: () => ({ goto: mockGotoSetup, prevState: undefined }),
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

  it("wires the screen's own Back into the gate", () => {
    mockIsGateOpen = false;
    render(<SetupBridgeOnboarding />);
    fireEvent.click(screen.getByTestId('gate-waiting'));
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.FundYourAgent);
  });
});
