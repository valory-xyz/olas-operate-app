import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { UnfinishedSetupAlert } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/UnfinishedSetupAlert';

// ---------------------------------------------------------------------------
// Mock UI components
// ---------------------------------------------------------------------------
jest.mock('../../../../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => (
    <div data-testid="alert">{message}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockHandleCompleteSetup = jest.fn();

const makeProps = (
  overrides: Partial<React.ComponentProps<typeof UnfinishedSetupAlert>> = {},
) => ({
  setupState: 'needsFunding' as const,
  handleCompleteSetup: mockHandleCompleteSetup,
  ...overrides,
});

describe('UnfinishedSetupAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the Complete Setup button in a loading state when setupState is detecting', () => {
    render(
      <UnfinishedSetupAlert {...makeProps({ setupState: 'detecting' })} />,
    );
    // AntD Button with loading=true prefixes the accessible name with "loading"
    expect(
      screen.getByRole('button', { name: /loading.*Complete Setup/i }),
    ).toBeInTheDocument();
  });

  it('enables the Complete Setup button when setupState is not detecting', () => {
    render(
      <UnfinishedSetupAlert {...makeProps({ setupState: 'needsFunding' })} />,
    );
    expect(
      screen.getByRole('button', { name: 'Complete Setup' }),
    ).not.toBeDisabled();
  });

  it('calls handleCompleteSetup when Complete Setup button is clicked', () => {
    render(<UnfinishedSetupAlert {...makeProps()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Complete Setup' }));
    expect(mockHandleCompleteSetup).toHaveBeenCalledTimes(1);
  });
});
