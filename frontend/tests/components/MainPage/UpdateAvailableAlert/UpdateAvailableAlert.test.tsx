import { render, screen } from '@testing-library/react';

// --- Import under test ---
import { UpdateAvailableAlert } from '../../../../components/MainPage/UpdateAvailableAlert/UpdateAvailableAlert';
import { DOWNLOAD_URL } from '../../../../constants/urls';

// --- Mocks ---

const mockUseAppStatus = jest.fn();

jest.mock(
  '../../../../components/MainPage/UpdateAvailableAlert/useAppStatus',
  () => ({ useAppStatus: (...args: unknown[]) => mockUseAppStatus(...args) }),
);

jest.mock('../../../../components/ui', () => ({
  Alert: (props: { message: React.ReactNode; type: string }) => (
    <div data-testid="alert" data-type={props.type}>
      {props.message}
    </div>
  ),
}));

// --- Tests ---

describe('UpdateAvailableAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('returns null (early exits)', () => {
    it('returns null and logs console.error when isError is true', () => {
      const testError = new Error('network failure');
      mockUseAppStatus.mockReturnValue({
        data: undefined,
        isFetched: true,
        isError: true,
        error: testError,
      });

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const { container } = render(<UpdateAvailableAlert />);

      expect(container.innerHTML).toBe('');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Update check failed:',
        testError,
      );

      consoleSpy.mockRestore();
    });

    it('returns null when isFetched is false', () => {
      mockUseAppStatus.mockReturnValue({
        data: undefined,
        isFetched: false,
        isError: false,
        error: null,
      });

      const { container } = render(<UpdateAvailableAlert />);
      expect(container.innerHTML).toBe('');
    });

    it('returns null when data is undefined', () => {
      mockUseAppStatus.mockReturnValue({
        data: undefined,
        isFetched: true,
        isError: false,
        error: null,
      });

      const { container } = render(<UpdateAvailableAlert />);
      expect(container.innerHTML).toBe('');
    });

    it('returns null when data.isOutdated is false', () => {
      mockUseAppStatus.mockReturnValue({
        data: { isOutdated: false, latestTag: 'v1.0.0' },
        isFetched: true,
        isError: false,
        error: null,
      });

      const { container } = render(<UpdateAvailableAlert />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('renders alert when update is available', () => {
    beforeEach(() => {
      mockUseAppStatus.mockReturnValue({
        data: { isOutdated: true, latestTag: 'v2.0.0' },
        isFetched: true,
        isError: false,
        error: null,
      });
    });

    it('renders Alert with "Pearl Update Available" text', () => {
      render(<UpdateAvailableAlert />);

      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText('Pearl Update Available')).toBeInTheDocument();
    });

    it('renders download link with DOWNLOAD_URL href', () => {
      render(<UpdateAvailableAlert />);

      const link = screen.getByRole('link', { name: /download/i });
      expect(link).toHaveAttribute('href', DOWNLOAD_URL);
    });

    it('renders download link with target="_blank"', () => {
      render(<UpdateAvailableAlert />);

      const link = screen.getByRole('link', { name: /download/i });
      expect(link).toHaveAttribute('target', '_blank');
    });
  });
});
