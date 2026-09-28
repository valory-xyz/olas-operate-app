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

  it('renders nothing when the agent is progressing', () => {
    mockUseAgentActivity.mockReturnValue({ isAgentStalled: false });
    const { container } = render(<AgentStalledAlert />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders as a warning rather than an error', () => {
    mockUseAgentActivity.mockReturnValue({ isAgentStalled: true });
    render(<AgentStalledAlert />);

    expect(screen.getByTestId('alert')).toHaveAttribute('data-type', 'warning');
  });

  it('promises no automatic restart', () => {
    mockUseAgentActivity.mockReturnValue({ isAgentStalled: true });
    render(<AgentStalledAlert />);

    expect(screen.getByTestId('alert').textContent).not.toMatch(/restart/i);
  });
});
