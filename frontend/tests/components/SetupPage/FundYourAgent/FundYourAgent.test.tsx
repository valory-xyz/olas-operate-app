import { fireEvent, render, screen } from '@testing-library/react';

import { FundingFlowProps } from '../../../../components/FundingFlow';
// Import after mocks
import { FundYourAgent } from '../../../../components/SetupPage/FundYourAgent/FundYourAgent';
import { SETUP_SCREEN } from '../../../../constants';
import { EvmChainIdMap } from '../../../../constants/chains';
import {
  backupSignerGateState,
  resetBackupSignerGateState,
} from '../../../helpers/backupSignerGateMock';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({ PROVIDERS: {} }));

const mockGotoSetup = jest.fn();
const mockResetTokenRequirements = jest.fn();
const mockUseServices = jest.fn();
const BACKUP_OWNER = '0x2222222222222222222222222222222222222222';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('../../../../components/SetupPage/BackupSignerGate', () => ({
  BackupSignerGate: require('../../../helpers/backupSignerGateMock')
    .backupSignerGateMock,
}));
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('../../../../hooks', () => ({
  useSetup: () => ({ goto: mockGotoSetup }),
  useServices: () => mockUseServices(),
  useGetRefillRequirements: () => ({
    refillTokenRequirements: [{ symbol: 'OLAS', amount: 1 }],
    isLoading: false,
    resetTokenRequirements: mockResetTokenRequirements,
  }),
}));

let mockFlowProps: FundingFlowProps | null = null;
jest.mock('../../../../components/FundingFlow', () => ({
  FundingFlow: (props: FundingFlowProps) => {
    mockFlowProps = props;
    return (
      <button data-testid="back-button" onClick={props.onBack}>
        Back
      </button>
    );
  },
}));

const setup = (defaultStakingProgramId?: string) => {
  mockUseServices.mockReturnValue({
    selectedAgentConfig: {
      evmHomeChainId: EvmChainIdMap.Polygon,
      displayName: 'Polystrat',
      defaultStakingProgramId,
    },
    selectedService: { service_config_id: 'sc-polystrat' },
  });
};

describe('FundYourAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFlowProps = null;
    resetBackupSignerGateState();
    backupSignerGateState.signer = {
      state: 'ready',
      backupSignerAddress: BACKUP_OWNER,
    };
  });

  it('renders the funding flow for the new agent instead of Buy, Transfer and Bridge', () => {
    setup('pearl_beta');
    render(<FundYourAgent />);

    expect(mockFlowProps).toMatchObject({
      mode: 'onboard',
      serviceConfigId: 'sc-polystrat',
      backupOwner: BACKUP_OWNER,
      destinationChain: 'polygon',
      fallbackToReceive: [{ symbol: 'OLAS', amount: 1 }],
    });
    expect(
      screen.queryByText(/Transfer Crypto on|Bridge Crypto|Buy/),
    ).toBeNull();
  });

  it('waits for the service instead of opening a flow it could not start', () => {
    mockUseServices.mockReturnValue({
      selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Polygon },
      selectedService: undefined,
    });
    render(<FundYourAgent />);

    expect(mockFlowProps).toBeNull();
  });

  it('does not open the flow (which creates the Pearl Safe) until the gate opens', () => {
    setup();
    backupSignerGateState.isOpen = false;
    render(<FundYourAgent />);

    expect(mockFlowProps).toBeNull();
    expect(screen.getByTestId('gate-waiting')).toBeInTheDocument();
  });

  it('routes back to AgentOnboarding for a no_staking agent (e.g. Connect)', () => {
    setup('no_staking');
    render(<FundYourAgent />);

    fireEvent.click(screen.getByTestId('back-button'));

    expect(mockResetTokenRequirements).toHaveBeenCalledTimes(1);
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding);
  });

  it("wires the screen's own Back into the gate", () => {
    setup('pearl_beta');
    backupSignerGateState.isOpen = false;
    render(<FundYourAgent />);

    fireEvent.click(screen.getByTestId('gate-waiting'));

    expect(mockResetTokenRequirements).toHaveBeenCalledTimes(1);
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.SelectStaking);
  });

  it('routes back to SelectStaking for a staking agent', () => {
    setup('pearl_beta');
    render(<FundYourAgent />);

    fireEvent.click(screen.getByTestId('back-button'));

    expect(mockResetTokenRequirements).toHaveBeenCalledTimes(1);
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.SelectStaking);
  });
});
