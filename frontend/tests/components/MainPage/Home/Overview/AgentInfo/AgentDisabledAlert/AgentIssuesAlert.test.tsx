import { render, screen } from '@testing-library/react';
import React from 'react';

import { AgentIssuesAlert } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/AgentIssuesAlert';

jest.mock('../../../../../../../components/ui', () => ({
  Alert: ({ message, type }: { message: React.ReactNode; type: string }) => (
    <div data-testid="alert" data-type={type}>
      {message}
    </div>
  ),
}));

describe('AgentIssuesAlert', () => {
  it('shows each issue as the agent wrote it, in one warning', () => {
    render(
      <AgentIssuesAlert
        issues={[
          { title: "Can't reach Polymarket", description: 'First text.' },
          { title: 'Another problem', description: 'Second text.' },
        ]}
      />,
    );

    expect(screen.getAllByTestId('alert')).toHaveLength(1);
    expect(screen.getByTestId('alert')).toHaveAttribute('data-type', 'warning');
    expect(screen.getByText("Can't reach Polymarket")).toBeInTheDocument();
    expect(screen.getByText('First text.')).toBeInTheDocument();
    expect(screen.getByText('Another problem')).toBeInTheDocument();
    expect(screen.getByText('Second text.')).toBeInTheDocument();
  });
});
