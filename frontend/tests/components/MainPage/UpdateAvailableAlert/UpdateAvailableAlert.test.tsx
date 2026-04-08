import { fireEvent, render, screen } from '@testing-library/react';

// --- Import under test ---
import { UpdateAvailableAlert } from '../../../../components/MainPage/UpdateAvailableAlert/UpdateAvailableAlert';

// --- Mocks ---

const mockUseAppStatus = jest.fn();

jest.mock(
  '../../../../components/MainPage/UpdateAvailableAlert/useAppStatus',
  () => ({ useAppStatus: (...args: unknown[]) => mockUseAppStatus(...args) }),
);

// --- Tests ---

describe('UpdateAvailableAlert', () => {
  const mockOnOpen = jest.fn();

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

      const { container } = render(<UpdateAvailableAlert onOpen={mockOnOpen} />);

      expect(container.innerHTML).toBe('');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Update check failed:',
        testError,
      );

      consoleSpy.mockRestore();
    });

    it("shouldn't show alert when isFetched is false", () => {
      mockUseAppStatus.mockReturnValue({
        data: undefined,
        isFetched: false,
        isError: false,
        error: null,
      });

      const { container } = render(<UpdateAvailableAlert onOpen={mockOnOpen} />);
      expect(container.innerHTML).toBe('');
    });

    it("shouldn't show alert when data is undefined", () => {
      mockUseAppStatus.mockReturnValue({
        data: undefined,
        isFetched: true,
        isError: false,
        error: null,
      });

      const { container } = render(<UpdateAvailableAlert onOpen={mockOnOpen} />);
      expect(container.innerHTML).toBe('');
    });

    it("shouldn't show alert when data.isOutdated is false", () => {
      mockUseAppStatus.mockReturnValue({
        data: { isOutdated: false, latestTag: 'v1.0.0', releaseNotes: null },
        isFetched: true,
        isError: false,
        error: null,
      });

      const { container } = render(<UpdateAvailableAlert onOpen={mockOnOpen} />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('renders card when update is available', () => {
    beforeEach(() => {
      mockUseAppStatus.mockReturnValue({
        data: { isOutdated: true, latestTag: 'v2.0.0', releaseNotes: null },
        isFetched: true,
        isError: false,
        error: null,
      });
    });

    it('renders "Update Pearl Now" text', () => {
      render(<UpdateAvailableAlert onOpen={mockOnOpen} />);
      expect(screen.getByText('Update Pearl Now')).toBeInTheDocument();
    });

    it('renders a button (not a static link)', () => {
      render(<UpdateAvailableAlert onOpen={mockOnOpen} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('calls onOpen when clicked', () => {
      render(<UpdateAvailableAlert onOpen={mockOnOpen} />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnOpen).toHaveBeenCalledTimes(1);
    });
  });
});
