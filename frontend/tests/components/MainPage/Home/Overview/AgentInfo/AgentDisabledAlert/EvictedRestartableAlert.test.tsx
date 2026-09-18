import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const mockHandleStart = jest.fn();
jest.mock('../../../../../../../hooks', () => ({
  useServiceDeployment: () => ({ handleStart: mockHandleStart }),
}));

describe('EvictedRestartableAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleStart.mockResolvedValue(undefined);
  });

  it('explains that the agent can stake again', () => {
    render(<EvictedRestartableAlert />);

    expect(
      screen.getByText('Agent was evicted from staking'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /It's eligible to stake again — restart it to re-stake and resume earning rewards\./,
      ),
    ).toBeInTheDocument();
  });

  it('starts the service exactly once when the button is clicked', async () => {
    render(<EvictedRestartableAlert />);

    fireEvent.click(screen.getByRole('button', { name: /Restart agent/ }));

    await waitFor(() => expect(mockHandleStart).toHaveBeenCalledTimes(1));
  });

  it('disables the button while the start is in flight', async () => {
    let releaseStart: (() => void) | undefined;
    mockHandleStart.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseStart = resolve;
        }),
    );
    render(<EvictedRestartableAlert />);
    const button = screen.getByRole('button', { name: /Restart agent/ });

    fireEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());

    releaseStart?.();
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('re-enables the button when the start fails, so the user can retry', async () => {
    mockHandleStart.mockRejectedValue(new Error('start failed'));
    render(<EvictedRestartableAlert />);
    const button = screen.getByRole('button', { name: /Restart agent/ });

    fireEvent.click(button);

    await waitFor(() => expect(button).toBeEnabled());
    expect(mockHandleStart).toHaveBeenCalledTimes(1);
  });
});
