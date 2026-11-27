import { render, screen } from '@testing-library/react';

import { AgentLowBalanceAlert } from '../../components/AgentLowBalanceAlert';
import { EvmChainIdMap } from '../../constants/chains';
import { useAgentFundingRequests, useServices } from '../../hooks';

jest.mock('../../hooks', () => ({
  useAgentFundingRequests: jest.fn(),
  useServices: jest.fn(),
  // The alert must not read the subgraph-first program: a stale one names a
  // contract after an unstake.
  useStakingProgram: () => ({ selectedStakingProgramId: 'connect_i' }),
}));

const mockUseAgentFundingRequests = useAgentFundingRequests as jest.Mock;
const mockUseServices = useServices as jest.Mock;

const CONNECT = {
  hasStaking: false,
  defaultStakingProgramId: 'no_staking',
  stakingChains: [EvmChainIdMap.Gnosis, EvmChainIdMap.Robinhood],
};

const setup = (
  over: {
    isAgentBalanceLow?: boolean;
    agentConfig?: Record<string, unknown>;
    evmHomeChainId?: number;
    /** The service's own stored program; `undefined` is no service. */
    serviceStakingProgramId?: string | null;
  } = {},
) => {
  const {
    isAgentBalanceLow = true,
    agentConfig = { hasStaking: true },
    evmHomeChainId = EvmChainIdMap.Gnosis,
  } = over;
  mockUseAgentFundingRequests.mockReturnValue({
    isAgentBalanceLow,
    agentTokenRequirementsFormatted: '5 XDAI',
  });
  mockUseServices.mockReturnValue({
    selectedAgentConfig: { ...agentConfig, evmHomeChainId },
    selectedService:
      'serviceStakingProgramId' in over
        ? {
            home_chain: 'gnosis',
            chain_configs: {
              gnosis: {
                chain_data: {
                  user_params: {
                    staking_program_id: over.serviceStakingProgramId,
                  },
                },
              },
            },
          }
        : undefined,
  });
  return render(<AgentLowBalanceAlert onFund={jest.fn()} />);
};

const mentionsStaking = () =>
  !!screen.queryByText(/meet staking requirements/i);

describe('AgentLowBalanceAlert', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when the agent balance is not low', () => {
    const { container } = setup({ isAgentBalanceLow: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('mentions staking requirements for staking agents', () => {
    setup();
    expect(
      screen.getByText(
        /perform on-chain activity and meet staking requirements\./i,
      ),
    ).toBeInTheDocument();
  });

  it('omits staking requirements for an agent that cannot stake', () => {
    setup({ agentConfig: { hasStaking: false } });
    expect(
      screen.getByText(/perform on-chain activity\./i),
    ).toBeInTheDocument();
    expect(mentionsStaking()).toBe(false);
  });

  it.each([
    ['staked on Gnosis', EvmChainIdMap.Gnosis, 'connect_i', true],
    ['on Polygon', EvmChainIdMap.Polygon, 'connect_i', false],
    ['unstaked on Gnosis', EvmChainIdMap.Gnosis, 'no_staking', false],
    ['with no stored program', EvmChainIdMap.Gnosis, null, false],
  ])(
    'follows the Connect service %s',
    (_, evmHomeChainId, serviceStakingProgramId, expected) => {
      setup({ agentConfig: CONNECT, evmHomeChainId, serviceStakingProgramId });
      expect(mentionsStaking()).toBe(expected);
    },
  );

  it('omits them for an unstaked Connect while the subgraph still names a contract', () => {
    // useStakingProgram (mocked above) still answers connect_i
    setup({ agentConfig: CONNECT, serviceStakingProgramId: 'no_staking' });
    expect(mentionsStaking()).toBe(false);
  });

  it('omits them while the Connect service has not loaded', () => {
    setup({ agentConfig: CONNECT });
    expect(mentionsStaking()).toBe(false);
  });
});
