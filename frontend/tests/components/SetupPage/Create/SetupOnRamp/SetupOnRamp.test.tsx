import { fireEvent, render, screen } from '@testing-library/react';

import { SetupOnRamp } from '../../../../../components/SetupPage/Create/SetupOnRamp/SetupOnRamp';
import { EvmChainIdMap } from '../../../../../constants/chains';
import { SETUP_SCREEN } from '../../../../../constants/setupScreen';

jest.mock('../../../../../constants/providers', () => ({ PROVIDERS: {} }));

let mockIsGateOpen = true;
const mockGotoSetup = jest.fn();

// The gate's loader, error and context sharing are covered by BackupSignerGate.test.tsx.
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
    selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Gnosis },
  }),
  useSetup: () => ({ goto: mockGotoSetup, prevState: undefined }),
}));

jest.mock('../../../../../components/OnRamp', () => ({
  OnRamp: () => <div data-testid="on-ramp" />,
}));

describe('SetupOnRamp', () => {
  afterEach(() => {
    mockIsGateOpen = true;
  });

  it('renders the on-ramp inside the backup signer gate', () => {
    render(<SetupOnRamp />);
    expect(screen.getByTestId('on-ramp')).toBeInTheDocument();
  });

  it('does not open the on-ramp (which creates the Pearl Safe) until the gate opens', () => {
    mockIsGateOpen = false;
    render(<SetupOnRamp />);
    expect(screen.queryByTestId('on-ramp')).not.toBeInTheDocument();
    expect(screen.getByTestId('gate-waiting')).toBeInTheDocument();
  });

  it("wires the screen's own Back into the gate", () => {
    mockIsGateOpen = false;
    render(<SetupOnRamp />);
    fireEvent.click(screen.getByTestId('gate-waiting'));
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.FundYourAgent);
  });
});
