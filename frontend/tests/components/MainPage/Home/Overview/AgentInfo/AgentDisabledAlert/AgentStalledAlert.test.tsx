import { render, screen } from '@testing-library/react';
import React from 'react';

import { AgentStalledAlert } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/AgentStalledAlert';
import { useAgentActivity } from '../../../../../../../hooks';

jest.mock('../../../../../../../components/ui', () => ({
  Alert: ({ message, type }: { message: React.ReactNode; type?: string }) => (
    <div data-testid="alert" data-type={type}>
      {message}
    </div>
  ),
}));

jest.mock('../../../../../../../hooks', () => ({
  useAgentActivity: jest.fn(),
}));

const mockUseAgentActivity = useAgentActivity as jest.Mock;

describe('AgentStalledAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('announces the stall when the agent is not progressing', () => {
    mockUseAgentActivity.mockReturnValue({ isAgentStalled: true });
    render(<AgentStalledAlert />);

    expect(screen.getByText("Agent isn't progressing")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Your agent hasn't made progress in a few minutes\. You don't need to do anything yet\./,
      ),
    ).toBeInTheDocument();
  });

  // It sits in the non-exclusive group of the alert ladder, so it has to hide
  // itself: an always-rendered alert would occupy the slot for every healthy
  // agent and mask the low-balance alerts beside it.
  it('renders nothing when the agent is progressing', () => {
    mockUseAgentActivity.mockReturnValue({ isAgentStalled: false });
    const { container } = render(<AgentStalledAlert />);

    expect(container).toBeEmptyDOMElement();
  });

  // A stall is recoverable, so it is a warning rather than an error — `error`
  // is reserved in this repo for hard failures.
  it('renders as a warning rather than an error', () => {
    mockUseAgentActivity.mockReturnValue({ isAgentStalled: true });
    render(<AgentStalledAlert />);

    expect(screen.getByTestId('alert')).toHaveAttribute('data-type', 'warning');
  });

  // The copy must not promise an automatic restart. The middleware does restart
  // an agent after 300 s of unhealthy probes today, but the incoming trader fix
  // keeps `is_healthy` true for up to 700 s in the affected rounds, so Pearl can
  // show a two-minute stall with no restart coming.
  it('promises no automatic restart', () => {
    mockUseAgentActivity.mockReturnValue({ isAgentStalled: true });
    render(<AgentStalledAlert />);

    expect(screen.getByTestId('alert').textContent).not.toMatch(/restart/i);
  });
});
