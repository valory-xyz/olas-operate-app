import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';

// --- Import under test ---
import { UpdateAvailableModal } from '../../../../components/MainPage/UpdateAvailableAlert/UpdateAvailableModal';
import { DOWNLOAD_URL } from '../../../../constants/urls';

// --- Mocks ---

const mockUseAppStatus = jest.fn();
jest.mock(
  '../../../../components/MainPage/UpdateAvailableAlert/useAppStatus',
  () => ({ useAppStatus: (...args: unknown[]) => mockUseAppStatus(...args) }),
);

const mockStoreGet = jest.fn();
const mockStoreSet = jest.fn();
const mockDownloadUpdate = jest.fn();
const mockCancelDownload = jest.fn();
const mockQuitAndInstall = jest.fn();
const mockOnDownloadProgress = jest.fn();
const mockOnUpdateDownloaded = jest.fn();
const mockOnUpdateError = jest.fn();

jest.mock('../../../../hooks', () => ({
  useElectronApi: () => ({
    store: { get: mockStoreGet, set: mockStoreSet },
    updates: {
      downloadUpdate: mockDownloadUpdate,
      cancelDownload: mockCancelDownload,
      quitAndInstall: mockQuitAndInstall,
      onDownloadProgress: mockOnDownloadProgress,
      onUpdateDownloaded: mockOnUpdateDownloaded,
      onUpdateError: mockOnUpdateError,
    },
  }),
}));

jest.mock('next/image', () => {
  const MockImage = (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  );
  MockImage.displayName = 'MockImage';
  return { __esModule: true, default: MockImage };
});

jest.mock('react-markdown', () => {
  const MockMarkdown = ({ children }: { children: string }) => (
    <div data-testid="markdown">{children}</div>
  );
  MockMarkdown.displayName = 'MockMarkdown';
  return { __esModule: true, default: MockMarkdown };
});

jest.mock('../../../../components/ui', () => ({
  Modal: (props: {
    title?: string;
    description?: React.ReactNode;
    header?: React.ReactNode;
    onCancel?: () => void;
    open?: boolean;
    children?: React.ReactNode;
  }) => (
    <div data-testid="modal">
      {props.header && (
        <div data-testid="modal-header">{props.header}</div>
      )}
      {props.title && (
        <div data-testid="modal-title">{props.title}</div>
      )}
      {props.description && (
        <div data-testid="modal-description">{props.description}</div>
      )}
    </div>
  ),
}));

// --- Helpers ---

const defaultAppStatusOutdated = {
  data: { isOutdated: true, latestTag: 'v2.0.0', releaseNotes: null },
  isFetched: true,
};

// --- Tests ---

describe('UpdateAvailableModal', () => {
  let windowOpenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreGet.mockResolvedValue(undefined);
    mockUseAppStatus.mockReturnValue(defaultAppStatusOutdated);
    mockDownloadUpdate.mockResolvedValue(undefined);
    mockQuitAndInstall.mockResolvedValue(undefined);
    windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    // Default: all listeners return cleanup fns
    mockOnDownloadProgress.mockReturnValue(() => {});
    mockOnUpdateDownloaded.mockReturnValue(() => {});
    mockOnUpdateError.mockReturnValue(() => {});
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  describe('returns null when not open', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <UpdateAvailableModal isOpen={false} onClose={() => {}} />,
      );
      expect(container.innerHTML).toBe('');
    });
  });

  describe('auto-open useEffect', () => {
    it('does nothing when isFetched is false', async () => {
      mockUseAppStatus.mockReturnValue({
        data: { isOutdated: true, latestTag: 'v2.0.0', releaseNotes: null },
        isFetched: false,
      });

      await act(async () => {
        render(<UpdateAvailableModal isOpen={false} onClose={() => {}} />);
      });

      expect(mockStoreGet).not.toHaveBeenCalled();
    });

    it('does nothing when data.isOutdated is false', async () => {
      mockUseAppStatus.mockReturnValue({
        data: { isOutdated: false, latestTag: 'v2.0.0', releaseNotes: null },
        isFetched: true,
      });

      await act(async () => {
        render(<UpdateAvailableModal isOpen={false} onClose={() => {}} />);
      });

      expect(mockStoreGet).not.toHaveBeenCalled();
    });

    it('reads store when update is available', async () => {
      await act(async () => {
        render(<UpdateAvailableModal isOpen={false} onClose={() => {}} />);
      });

      expect(mockStoreGet).toHaveBeenCalledWith('updateAvailableKnownVersion');
    });

    it('logs console.error when store.get rejects', async () => {
      const storeError = new Error('store read failure');
      mockStoreGet.mockRejectedValue(storeError);

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await act(async () => {
        render(<UpdateAvailableModal isOpen={false} onClose={() => {}} />);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to check update availability:',
        storeError,
      );

      consoleSpy.mockRestore();
    });
  });

  describe('IPC listener registration and cleanup', () => {
    it('registers onDownloadProgress, onUpdateDownloaded, and onUpdateError listeners on mount', () => {
      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);

      expect(mockOnDownloadProgress).toHaveBeenCalledTimes(1);
      expect(mockOnUpdateDownloaded).toHaveBeenCalledTimes(1);
      expect(mockOnUpdateError).toHaveBeenCalledTimes(1);
    });

    it('calls cleanup functions on unmount', () => {
      const cleanupProgress = jest.fn();
      const cleanupDownloaded = jest.fn();
      const cleanupError = jest.fn();
      mockOnDownloadProgress.mockReturnValue(cleanupProgress);
      mockOnUpdateDownloaded.mockReturnValue(cleanupDownloaded);
      mockOnUpdateError.mockReturnValue(cleanupError);

      const { unmount } = render(
        <UpdateAvailableModal isOpen={true} onClose={() => {}} />,
      );

      unmount();

      expect(cleanupProgress).toHaveBeenCalledTimes(1);
      expect(cleanupDownloaded).toHaveBeenCalledTimes(1);
      expect(cleanupError).toHaveBeenCalledTimes(1);
    });
  });

  describe('available state', () => {
    it('renders Update Available title', () => {
      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);
      expect(screen.getByTestId('modal-title')).toHaveTextContent(
        'Update Available',
      );
    });

    it('renders Pearl image', () => {
      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);
      expect(screen.getByAltText('Pearl')).toBeInTheDocument();
    });

    it('renders Update Later button', () => {
      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);
      expect(
        screen.getByRole('button', { name: 'Update Later' }),
      ).toBeInTheDocument();
    });

    it('renders Update & Relaunch button', () => {
      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);
      expect(
        screen.getByRole('button', { name: 'Update & Relaunch' }),
      ).toBeInTheDocument();
    });

    it('renders release notes accordion when releaseNotes is provided', () => {
      mockUseAppStatus.mockReturnValue({
        data: {
          isOutdated: true,
          latestTag: 'v2.0.0',
          releaseNotes: '## Changelog\n- New feature',
        },
        isFetched: true,
      });

      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);

      expect(
        screen.getByText("What's new in this version"),
      ).toBeInTheDocument();
    });

    it('does not render accordion when releaseNotes is null', () => {
      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);

      expect(
        screen.queryByText("What's new in this version"),
      ).not.toBeInTheDocument();
    });
  });

  describe('Update Later button', () => {
    it('calls store.set with latestTag and onClose', () => {
      const mockOnClose = jest.fn();
      render(<UpdateAvailableModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByRole('button', { name: 'Update Later' }));

      expect(mockStoreSet).toHaveBeenCalledWith(
        'updateAvailableKnownVersion',
        'v2.0.0',
      );
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Update & Relaunch button', () => {
    it('calls downloadUpdate and transitions to downloading state', async () => {
      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);

      fireEvent.click(screen.getByRole('button', { name: 'Update & Relaunch' }));

      expect(mockDownloadUpdate).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.getByTestId('modal-title')).toHaveTextContent(
          'Downloading Update',
        );
      });
    });
  });

  describe('downloading state', () => {
    it('renders Downloading Update title after clicking Update & Relaunch', async () => {
      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: 'Update & Relaunch' }));

      await waitFor(() => {
        expect(screen.getByTestId('modal-title')).toHaveTextContent(
          'Downloading Update',
        );
      });
    });

    it('renders Cancel button in downloading state', async () => {
      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: 'Update & Relaunch' }));

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Cancel' }),
        ).toBeInTheDocument();
      });
    });

    it('clicking Cancel calls cancelDownload and returns to available state', async () => {
      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: 'Update & Relaunch' }));

      await waitFor(() =>
        screen.getByRole('button', { name: 'Cancel' }),
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockCancelDownload).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.getByTestId('modal-title')).toHaveTextContent(
          'Update Available',
        );
      });
    });

    it('calls quitAndInstall when onUpdateDownloaded fires', async () => {
      let capturedDownloadedCb: (() => void) | null = null;
      mockOnUpdateDownloaded.mockImplementation((cb: () => void) => {
        capturedDownloadedCb = cb;
        return () => {};
      });

      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: 'Update & Relaunch' }));

      await act(async () => {
        capturedDownloadedCb?.();
      });

      expect(mockQuitAndInstall).toHaveBeenCalledTimes(1);
    });
  });

  describe('failed state', () => {
    it('transitions to failed state when onUpdateError fires', async () => {
      let capturedErrorCb: (() => void) | null = null;
      mockOnUpdateError.mockImplementation((cb: () => void) => {
        capturedErrorCb = cb;
        return () => {};
      });

      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: 'Update & Relaunch' }));

      await act(async () => {
        capturedErrorCb?.();
      });

      await waitFor(() => {
        expect(screen.getByTestId('modal-title')).toHaveTextContent(
          'Download Failed',
        );
      });
    });

    it('renders Try Again button in failed state', async () => {
      let capturedErrorCb: (() => void) | null = null;
      mockOnUpdateError.mockImplementation((cb: () => void) => {
        capturedErrorCb = cb;
        return () => {};
      });

      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: 'Update & Relaunch' }));

      await act(async () => {
        capturedErrorCb?.();
      });

      await waitFor(() =>
        screen.getByRole('button', { name: 'Try Again' }),
      );
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });

    it('Try Again re-invokes downloadUpdate and returns to downloading state', async () => {
      let capturedErrorCb: (() => void) | null = null;
      mockOnUpdateError.mockImplementation((cb: () => void) => {
        capturedErrorCb = cb;
        return () => {};
      });

      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: 'Update & Relaunch' }));

      await act(async () => {
        capturedErrorCb?.();
      });

      await waitFor(() => screen.getByRole('button', { name: 'Try Again' }));

      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

      expect(mockDownloadUpdate).toHaveBeenCalledTimes(2);
      await waitFor(() => {
        expect(screen.getByTestId('modal-title')).toHaveTextContent(
          'Downloading Update',
        );
      });
    });

    it('renders DOWNLOAD_URL fallback button in failed state', async () => {
      let capturedErrorCb: (() => void) | null = null;
      mockOnUpdateError.mockImplementation((cb: () => void) => {
        capturedErrorCb = cb;
        return () => {};
      });

      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: 'Update & Relaunch' }));

      await act(async () => {
        capturedErrorCb?.();
      });

      await waitFor(() =>
        screen.getByRole('button', { name: 'Download from pearl.you' }),
      );

      fireEvent.click(
        screen.getByRole('button', { name: 'Download from pearl.you' }),
      );

      expect(windowOpenSpy).toHaveBeenCalledWith(DOWNLOAD_URL, '_blank');
    });
  });
});
