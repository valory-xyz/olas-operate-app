import { render, screen } from '@testing-library/react';
import { act, SyntheticEvent } from 'react';

import { Profile } from '../../../../../components/MainPage/Home/Profile/Profile';
import { useElectronApi, useServices } from '../../../../../hooks';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('../../../../../hooks', () => ({
  useElectronApi: jest.fn(),
  useServices: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

const mockUseElectronApi = useElectronApi as jest.Mock;
const mockUseServices = useServices as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retrieves the React-internal props object attached to a DOM element.
 * React 18 stores them under a key like `__reactProps$<random>`.
 */
const getReactProps = (element: Element): Record<string, unknown> => {
  const key = Object.keys(element).find((k) => k.startsWith('__reactProps'));
  if (!key) throw new Error('React props key not found on element');
  return (element as unknown as Record<string, Record<string, unknown>>)[key];
};

/**
 * Simulate an iframe error event by invoking the React onError handler
 * directly. jsdom does not propagate `error` events on iframes through
 * React's synthetic event system, so we invoke the handler with a
 * minimal SyntheticEvent-shaped object containing the given nativeEvent.
 */
const simulateIframeError = (
  iframe: HTMLIFrameElement,
  nativeEvent: ErrorEvent,
) => {
  const props = getReactProps(iframe);
  const onError = props.onError as (e: Partial<SyntheticEvent>) => void;
  act(() => onError({ nativeEvent }));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseElectronApi.mockReturnValue({ nextLogError: jest.fn() });
  });

  describe('Loading state', () => {
    it('shows spinner and loading text when deploymentDetails is undefined', () => {
      mockUseServices.mockReturnValue({ deploymentDetails: undefined });
      render(<Profile />);

      expect(screen.getByText(/loading the latest data/i)).toBeInTheDocument();
      expect(screen.getByText(/This may take a moment/i)).toBeInTheDocument();
      expect(screen.queryByRole('document')).not.toBeInTheDocument();
    });

    it('shows spinner and loading text when deploymentDetails.healthcheck is empty', () => {
      mockUseServices.mockReturnValue({
        deploymentDetails: { healthcheck: {} },
      });
      render(<Profile />);

      expect(screen.getByText(/loading the latest data/i)).toBeInTheDocument();
      expect(screen.queryByTitle('agent-ui')).not.toBeInTheDocument();
    });

    it('shows spinner and loading text when deploymentDetails is null', () => {
      mockUseServices.mockReturnValue({ deploymentDetails: null });
      render(<Profile />);

      expect(screen.getByText(/loading the latest data/i)).toBeInTheDocument();
    });
  });

  describe('Iframe state', () => {
    const healthyDeploymentDetails = {
      healthcheck: { is_healthy: true },
    };

    it('renders iframe with src="http://127.0.0.1:8716" when healthcheck has data', () => {
      mockUseServices.mockReturnValue({
        deploymentDetails: healthyDeploymentDetails,
      });
      const { container } = render(<Profile />);

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', 'http://127.0.0.1:8716');
    });

    it('iframe has id="agent-ui" and allow="popups"', () => {
      mockUseServices.mockReturnValue({
        deploymentDetails: healthyDeploymentDetails,
      });
      const { container } = render(<Profile />);

      const iframe = container.querySelector('iframe');
      expect(iframe).toHaveAttribute('id', 'agent-ui');
      expect(iframe).toHaveAttribute('allow', 'popups');
    });

    it('does not show spinner or loading text when healthcheck has data', () => {
      mockUseServices.mockReturnValue({
        deploymentDetails: healthyDeploymentDetails,
      });
      render(<Profile />);

      expect(
        screen.queryByText(/loading the latest data/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/This may take a moment/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('calls nextLogError on iframe error with correct error message from ErrorEvent', () => {
      const mockNextLogError = jest.fn();
      mockUseElectronApi.mockReturnValue({ nextLogError: mockNextLogError });
      mockUseServices.mockReturnValue({
        deploymentDetails: { healthcheck: { is_healthy: true } },
      });

      const { container } = render(<Profile />);
      const iframe = container.querySelector('iframe')!;

      simulateIframeError(
        iframe,
        new ErrorEvent('error', { message: 'Network failure' }),
      );

      expect(mockNextLogError).toHaveBeenCalledTimes(1);
      const [errorArg, infoArg] = mockNextLogError.mock.calls[0];
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.message).toBe('Network failure');
      expect(infoArg).toEqual({
        errorInfo:
          '[Profile] Agent UI iframe failed to load from http://127.0.0.1:8716',
      });
    });

    it('uses fallback message when ErrorEvent has no message', () => {
      const mockNextLogError = jest.fn();
      mockUseElectronApi.mockReturnValue({ nextLogError: mockNextLogError });
      mockUseServices.mockReturnValue({
        deploymentDetails: { healthcheck: { is_healthy: true } },
      });

      const { container } = render(<Profile />);
      const iframe = container.querySelector('iframe')!;

      simulateIframeError(iframe, new ErrorEvent('error', { message: '' }));

      expect(mockNextLogError).toHaveBeenCalledTimes(1);
      const [errorArg] = mockNextLogError.mock.calls[0];
      expect(errorArg.message).toBe('Agent UI iframe failed to load');
    });

    it('does not throw when nextLogError is undefined (optional chaining)', () => {
      mockUseElectronApi.mockReturnValue({ nextLogError: undefined });
      mockUseServices.mockReturnValue({
        deploymentDetails: { healthcheck: { is_healthy: true } },
      });

      const { container } = render(<Profile />);
      const iframe = container.querySelector('iframe')!;

      expect(() => {
        simulateIframeError(
          iframe,
          new ErrorEvent('error', { message: 'Some error' }),
        );
      }).not.toThrow();
    });
  });
});
