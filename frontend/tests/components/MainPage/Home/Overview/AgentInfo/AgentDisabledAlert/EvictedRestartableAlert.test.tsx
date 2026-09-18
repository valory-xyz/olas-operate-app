import { render, screen } from '@testing-library/react';
import React from 'react';

import { EvictedRestartableAlert } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/EvictedRestartableAlert';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('../../../../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => (
    <div data-testid="alert">{message}</div>
  ),
}));

describe('EvictedRestartableAlert', () => {
  it('explains that the agent can stake again', () => {
    render(<EvictedRestartableAlert />);

    expect(
      screen.getByText('Agent was evicted from staking'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /It's eligible to stake again — restarting it will re-stake the agent and resume rewards\./,
      ),
    ).toBeInTheDocument();
  });

  // `AgentInfo` renders `AgentRunButton` directly above this alert, so a button
  // here would duplicate the "Start agent" control a few pixels up.
  it('renders no button of its own', () => {
    render(<EvictedRestartableAlert />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
