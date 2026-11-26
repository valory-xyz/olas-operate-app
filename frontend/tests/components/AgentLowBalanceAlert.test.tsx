import { render, screen } from '@testing-library/react';

import { AgentLowBalanceAlert } from '../../components/AgentLowBalanceAlert';
import { EvmChainIdMap } from '../../constants/chains';
import {
  useAgentFundingRequests,
  useServices,
  useStakingProgram,
} from '../../hooks';

jest.mock('../../hooks', () => ({
  useAgentFundingRequests: jest.fn(),
  useServices: jest.fn(),
  useStakingProgram: jest.fn(),
}));

const mockUseAgentFundingRequests = useAgentFundingRequests as jest.Mock;
const mockUseServices = useServices as jest.Mock;

const setup = (
  over: {
    isAgentBalanceLow?: boolean;
    hasStaking?: boolean;
    stakingChains?: number[];
    evmHomeChainId?: number;
    selectedStakingProgramId?: string;
  } = {},
) => {
  const {
    isAgentBalanceLow = true,
    hasStaking = true,
    stakingChains,
    evmHomeChainId = EvmChainIdMap.Gnosis,
    selectedStakingProgramId = 'connect_i',
  } = over;
  (useStakingProgram as jest.Mock).mockReturnValue({
    selectedStakingProgramId,
  });
  mockUseAgentFundingRequests.mockReturnValue({
    isAgentBalanceLow,
    agentTokenRequirementsFormatted: '5 XDAI',
  });
  mockUseServices.mockReturnValue({
    selectedAgentConfig: { hasStaking, stakingChains, evmHomeChainId },
  });
  return render(<AgentLowBalanceAlert onFund={jest.fn()} />);
};

describe('AgentLowBalanceAlert', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when the agent balance is not low', () => {
    const { container } = setup({ isAgentBalanceLow: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('mentions staking requirements for staking agents', () => {
    setup({ hasStaking: true });
    expect(
      screen.getByText(
        /perform on-chain activity and meet staking requirements\./i,
      ),
    ).toBeInTheDocument();
  });

  it('omits staking requirements for non-staking agents (e.g. Connect)', () => {
    setup({ hasStaking: false });
    expect(
      screen.getByText(/perform on-chain activity\./i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/meet staking requirements/i),
    ).not.toBeInTheDocument();
  });

  it.each([
    [EvmChainIdMap.Gnosis, true],
    [EvmChainIdMap.Polygon, false],
  ])(
    'follows where Connect can stake (chain %s → mentions staking: %s)',
    (evmHomeChainId, mentionsStaking) => {
      setup({
        hasStaking: false,
        stakingChains: [EvmChainIdMap.Gnosis, EvmChainIdMap.Robinhood],
        evmHomeChainId,
      });
      expect(!!screen.queryByText(/meet staking requirements/i)).toBe(
        mentionsStaking,
      );
    },
  );

  it('omits staking requirements for an unstaked Connect where it could stake', () => {
    setup({
      hasStaking: false,
      stakingChains: [EvmChainIdMap.Gnosis, EvmChainIdMap.Robinhood],
      evmHomeChainId: EvmChainIdMap.Gnosis,
      selectedStakingProgramId: 'no_staking',
    });
    expect(screen.queryByText(/meet staking requirements/i)).toBeNull();
  });
});
