import { useQuery } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { Performance } from '../../../../../components/MainPage/Home/Overview/Performance';
import { useService, useServices } from '../../../../../hooks';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
jest.mock('../../../../../hooks', () => ({
  useService: jest.fn(),
  useServices: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
}));

jest.mock('../../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => (
    <div data-testid="alert">{message}</div>
  ),
  CardFlex: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  InfoTooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockUseService = useService as jest.Mock;
const mockUseServices = useServices as jest.Mock;
const mockUseQuery = useQuery as jest.Mock;

const BANNER_TEXT = /Performance metrics aren't available in this app version/i;

const setServices = (agentConfigOverrides: Record<string, unknown> = {}) =>
  mockUseServices.mockReturnValue({
    selectedService: { service_config_id: 'config-1' },
    selectedAgentConfig: {
      defaultBehavior: 'Trade sizes adapt to market conditions.',
      ...agentConfigOverrides,
    },
  });

describe('Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseService.mockReturnValue({ isServiceActive: false });
    mockUseQuery.mockReturnValue({
      data: {
        metrics: [
          { name: 'ROI', value: '5%', is_primary: true, description: null },
        ],
        agent_behavior: null,
        timestamp: null,
      },
      isLoading: false,
    });
  });

  it('shows the metrics-unavailable banner instead of metrics when the flag is set', () => {
    setServices({ arePerformanceMetricsUnavailable: true });
    render(<Performance openProfile={jest.fn()} />);

    expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument();
    expect(screen.queryByText('ROI')).toBeNull();
  });

  it('still renders the agent behavior section when metrics are unavailable', () => {
    setServices({ arePerformanceMetricsUnavailable: true });
    render(<Performance openProfile={jest.fn()} />);

    expect(screen.getByText('Agent behavior')).toBeInTheDocument();
    expect(
      screen.getByText('Trade sizes adapt to market conditions.'),
    ).toBeInTheDocument();
  });

  it('shows performance metrics and no banner when the flag is not set', () => {
    setServices();
    render(<Performance openProfile={jest.fn()} />);

    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
    expect(screen.getByText('ROI')).toBeInTheDocument();
  });
});
