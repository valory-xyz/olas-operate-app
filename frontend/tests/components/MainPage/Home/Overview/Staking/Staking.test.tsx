import { render, screen } from '@testing-library/react';
import React from 'react';

import { Staking } from '../../../../../../components/MainPage/Home/Overview/Staking/Staking';
import {
  useActiveStakingContractDetails,
  useAgentActivity,
  usePageState,
  useServices,
} from '../../../../../../hooks';
import { makeService } from '../../../../../helpers/factories';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('../../../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => (
    <div data-testid="alert">{message}</div>
  ),
  CardFlex: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('../../../../../../hooks', () => ({
  useActiveStakingContractDetails: jest.fn(),
  useAgentActivity: jest.fn(),
  usePageState: jest.fn(),
  useServices: jest.fn(),
}));

jest.mock(
  '../../../../../../components/MainPage/Home/Overview/Staking/EpochClock',
  () => ({ EpochClock: () => <div>epoch-clock</div> }),
);
jest.mock(
  '../../../../../../components/MainPage/Home/Overview/Staking/Streak',
  () => ({ Streak: () => <div>streak</div> }),
);

const mockUseActiveStakingContractDetails =
  useActiveStakingContractDetails as jest.Mock;
const mockUseAgentActivity = useAgentActivity as jest.Mock;
const mockUsePageState = usePageState as jest.Mock;
const mockUseServices = useServices as jest.Mock;

const EVICTED_COPY =
  'The agent is evicted and cannot participate in staking until the eviction period ends.';
const RECOVERABLE_COPY =
  'The agent was evicted from staking but is eligible to stake again. Restart it to re-stake.';
const RUN_AGENT_COPY =
  'Start the agent to join staking and unlock protocol rewards.';
const UNDER_CONSTRUCTION_COPY =
  'The agent is under construction and cannot participate in staking until further notice.';

const setup = ({
  isAgentEvicted = false,
  isEligibleForStaking = true,
  isServiceRunning = true,
  isUnderConstruction = false,
}: {
  isAgentEvicted?: boolean;
  isEligibleForStaking?: boolean;
  isServiceRunning?: boolean;
  isUnderConstruction?: boolean;
} = {}) => {
  mockUseActiveStakingContractDetails.mockReturnValue({
    isAgentEvicted,
    isEligibleForStaking,
  });
  mockUseAgentActivity.mockReturnValue({ isServiceRunning });
  mockUseServices.mockReturnValue({
    selectedService: makeService(),
    selectedAgentConfig: { isUnderConstruction },
  });
  return render(<Staking />);
};

describe('Staking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePageState.mockReturnValue({ goto: jest.fn() });
  });

  describe('eviction alerts', () => {
    // The recoverable case used to render nothing here: both this card and the
    // alert strip were gated on `isAgentEvicted && !isEligibleForStaking`, so
    // the eviction was hidden exactly when restarting was the fix (OPE-1920).
    it('shows the recoverable copy when evicted but eligible to stake again', () => {
      setup({ isAgentEvicted: true, isEligibleForStaking: true });

      expect(screen.getByText(RECOVERABLE_COPY)).toBeInTheDocument();
      expect(screen.queryByText(EVICTED_COPY)).not.toBeInTheDocument();
    });

    it('shows the un-recoverable copy when evicted and not yet eligible', () => {
      setup({ isAgentEvicted: true, isEligibleForStaking: false });

      expect(screen.getByText(EVICTED_COPY)).toBeInTheDocument();
      expect(screen.queryByText(RECOVERABLE_COPY)).not.toBeInTheDocument();
    });

    // Guard: an eviction alert must win over "start the agent", which would
    // otherwise be the branch a stopped evicted agent falls into.
    it('prefers the eviction alert over the run-agent prompt', () => {
      setup({
        isAgentEvicted: true,
        isEligibleForStaking: true,
        isServiceRunning: false,
      });

      expect(screen.getByText(RECOVERABLE_COPY)).toBeInTheDocument();
      expect(screen.queryByText(RUN_AGENT_COPY)).not.toBeInTheDocument();
    });

    it('prefers the under-construction alert over any eviction alert', () => {
      setup({
        isUnderConstruction: true,
        isAgentEvicted: true,
        isEligibleForStaking: true,
      });

      expect(screen.getByText(UNDER_CONSTRUCTION_COPY)).toBeInTheDocument();
      expect(screen.queryByText(RECOVERABLE_COPY)).not.toBeInTheDocument();
    });
  });

  describe('non-evicted states', () => {
    it('prompts to start the agent when it is not running', () => {
      setup({ isServiceRunning: false });

      expect(screen.getByText(RUN_AGENT_COPY)).toBeInTheDocument();
    });

    it('shows no alert when the agent is running and not evicted', () => {
      setup({ isServiceRunning: true });

      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    });
  });
});
