import { render, screen } from '@testing-library/react';
import React from 'react';

import { FundingRequirementStep } from '../../../../components/SetupPage/AgentOnboarding/FundingRequirementStep';
import { AgentMap } from '../../../../constants';

// ---------------------------------------------------------------------------
// Mocks — keep the heavy presentational deps light so we can assert the copy
// rendered by the blocking MaintenanceAlert. The blocking path never reaches
// the funding-requirement hooks, so a stub is enough.
// ---------------------------------------------------------------------------
jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../../components/AgentIntroduction', () => ({
  IntroductionAnimatedContainer: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div>{children}</div>,
}));

jest.mock('../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => (
    <div data-testid="alert">{message}</div>
  ),
}));

jest.mock('../../../../hooks', () => ({
  useInitialFundingRequirements: () => ({}),
}));

describe('FundingRequirementStep — maintenance alert copy', () => {
  it('omits the "existing agents continue to run" line for a phased-out agent', () => {
    render(<FundingRequirementStep agentType={AgentMap.AgentsFun} />);

    expect(
      screen.getByText(/Agents.fun is currently unavailable/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/New Agents.fun agents cannot be created at this time/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Existing agents continue to run as usual/),
    ).not.toBeInTheDocument();
  });

  it('keeps the "existing agents continue to run" line for a blocked-but-not-phased-out agent', () => {
    // Optimus blocks new instances (isAddingNewBlocked) but is not phased out —
    // so existing instances still run.
    render(<FundingRequirementStep agentType={AgentMap.Optimus} />);

    expect(
      screen.getByText(/cannot be created at this time/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Existing agents continue to run as usual/),
    ).toBeInTheDocument();
  });
});
