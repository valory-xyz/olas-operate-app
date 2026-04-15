import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { UnfinishedSetupAlert } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/UnfinishedSetupAlert';
import { PAGES, SETUP_SCREEN } from '../../../../../../../constants';

// ---------------------------------------------------------------------------
// Mock navigation hooks
// ---------------------------------------------------------------------------
const mockGoto = jest.fn();
const mockGotoSetup = jest.fn();

jest.mock('../../../../../../../hooks', () => ({
  usePageState: () => ({ goto: mockGoto }),
  useSetup: () => ({ goto: mockGotoSetup }),
}));

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
const mockResetShouldNavigate = jest.fn();

const makeProps = (
  overrides: Partial<React.ComponentProps<typeof UnfinishedSetupAlert>> = {},
) => ({
  setupState: 'needsFunding' as const,
  handleCompleteSetup: mockHandleCompleteSetup,
  shouldNavigateToFundYourAgent: false,
  resetShouldNavigate: mockResetShouldNavigate,
  ...overrides,
});

describe('UnfinishedSetupAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables the Complete Setup button when setupState is detecting', () => {
    render(
      <UnfinishedSetupAlert {...makeProps({ setupState: 'detecting' })} />,
    );
    expect(
      screen.getByRole('button', { name: 'Complete Setup' }),
    ).toBeDisabled();
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

  it('navigates to FundYourAgent and calls resetShouldNavigate when shouldNavigateToFundYourAgent is true', () => {
    render(
      <UnfinishedSetupAlert
        {...makeProps({ shouldNavigateToFundYourAgent: true })}
      />,
    );
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.FundYourAgent);
    expect(mockGoto).toHaveBeenCalledWith(PAGES.Setup);
    expect(mockResetShouldNavigate).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when shouldNavigateToFundYourAgent is false', () => {
    render(
      <UnfinishedSetupAlert
        {...makeProps({ shouldNavigateToFundYourAgent: false })}
      />,
    );
    expect(mockGotoSetup).not.toHaveBeenCalled();
    expect(mockGoto).not.toHaveBeenCalled();
    expect(mockResetShouldNavigate).not.toHaveBeenCalled();
  });
});
