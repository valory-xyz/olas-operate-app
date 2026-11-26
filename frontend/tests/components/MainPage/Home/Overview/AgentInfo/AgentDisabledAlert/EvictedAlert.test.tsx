import { render, screen } from '@testing-library/react';
import React from 'react';

import { EvictedAlert } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/EvictedAlert';
import { useServices } from '../../../../../../../hooks';
import { useActiveStakingContractDetails } from '../../../../../../../hooks/useStakingContractDetails';

jest.mock('../../../../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => (
    <div data-testid="alert">{message}</div>
  ),
}));
jest.mock('../../../../../../../hooks', () => ({ useServices: jest.fn() }));
jest.mock('../../../../../../../hooks/useStakingContractDetails', () => ({
  useActiveStakingContractDetails: jest.fn(),
}));
jest.mock('../../../../../../../utils/time', () => ({
  formatToShortDateTime: () => 'Nov 18, 10:00',
}));

const setup = (canRunWhileEvicted?: boolean, selectedAgentType = 'trader') => {
  (useActiveStakingContractDetails as jest.Mock).mockReturnValue({
    evictionExpiresAt: 1_795_000_000,
  });
  (useServices as jest.Mock).mockReturnValue({
    selectedAgentConfig: { canRunWhileEvicted },
    selectedAgentType,
  });
  render(<EvictedAlert />);
  return screen.getByTestId('alert').textContent;
};

describe('EvictedAlert', () => {
  it('tells an agent that can run evicted that it can still collect winnings', () => {
    expect(setup(true)).toBe(
      "Agent is temporarily evicted The agent didn't meet staking requirements, and will be evicted until Nov 18, 10:00 (UTC). Until then it earns no staking rewards and places no trades. You can still run it to collect winnings from past trades.",
    );
  });

  it('keeps the banner of every other agent as it was', () => {
    expect(setup(undefined)).toBe(
      "Agent is temporarily evicted The agent didn't meet staking requirements for three consecutive epochs, and will be evicted until Nov 18, 10:00 (UTC). You can run it again after the eviction period ends.",
    );
  });

  it('tells a Connect agent it is still usable from its coding tool', () => {
    expect(setup(true, 'connect')).toBe(
      "Agent is temporarily evicted The agent didn't make its Marketplace request in two epochs in a row, and will be evicted until Nov 18, 10:00 (UTC). Until then it earns no staking rewards. You can keep using it from your coding tool.",
    );
  });
});
