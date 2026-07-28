import { render, screen } from '@testing-library/react';

import { AgentLowBalanceAlert } from '../../components/AgentLowBalanceAlert';
import { useAgentFundingRequests, useServices } from '../../hooks';

jest.mock('../../hooks', () => ({
  useAgentFundingRequests: jest.fn(),
  useServices: jest.fn(),
}));

const mockUseAgentFundingRequests = useAgentFundingRequests as jest.Mock;
const mockUseServices = useServices as jest.Mock;

const setup = (
  over: {
    isAgentBalanceLow?: boolean;
    hasStaking?: boolean;
  } = {},
) => {
  const { isAgentBalanceLow = true, hasStaking = true } = over;
  mockUseAgentFundingRequests.mockReturnValue({
    isAgentBalanceLow,
    agentTokenRequirementsFormatted: '5 XDAI',
  });
  mockUseServices.mockReturnValue({
    selectedAgentConfig: { hasStaking },
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
});
