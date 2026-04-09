import { fireEvent, render, screen } from '@testing-library/react';
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

const mockStoreSet = jest.fn();
const mockDownloadUpdate = jest.fn();
const mockCancelDownload = jest.fn();
const mockQuitAndInstall = jest.fn();
const mockOnDownloadProgress = jest.fn();
const mockOnUpdateDownloaded = jest.fn();
const mockOnUpdateError = jest.fn();

jest.mock('../../../../hooks', () => ({
  useElectronApi: () => ({
    store: { set: mockStoreSet },
    autoUpdater: {
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

jest.mock('../../../../components/custom-icons', () => ({
  LoadingOutlined: () => <div data-testid="loading-icon" />,
  WarningOutlined: () => <div data-testid="warning-icon" />,
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
      expect(screen.getByText('Update Available')).toBeInTheDocument();
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

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Update & Relaunch' }),
        );
      });

      expect(mockDownloadUpdate).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Downloading Update')).toBeInTheDocument();
    });

    it('transitions to failed state when downloadUpdate rejects', async () => {
      mockDownloadUpdate.mockRejectedValue(new Error('IPC error'));

      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Update & Relaunch' }),
        );
      });

      expect(screen.getByText('Download Failed')).toBeInTheDocument();
    });
  });

  describe('downloading state', () => {
    it('renders Downloading Update title after clicking Update & Relaunch', async () => {
      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Update & Relaunch' }),
        );
      });

      expect(screen.getByText('Downloading Update')).toBeInTheDocument();
    });

    it('renders Cancel button in downloading state', async () => {
      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Update & Relaunch' }),
        );
      });

      expect(
        screen.getByRole('button', { name: 'Cancel' }),
      ).toBeInTheDocument();
    });

    it('clicking Cancel calls cancelDownload and returns to available state', async () => {
      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Update & Relaunch' }),
        );
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      });

      expect(mockCancelDownload).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Update Available')).toBeInTheDocument();
    });

    it('calls quitAndInstall when onUpdateDownloaded fires', async () => {
      let capturedDownloadedCb: (() => void) | null = null;
      mockOnUpdateDownloaded.mockImplementation((cb: () => void) => {
        capturedDownloadedCb = cb;
        return () => {};
      });

      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Update & Relaunch' }),
        );
      });

      await act(async () => {
        capturedDownloadedCb?.();
      });

      expect(mockQuitAndInstall).toHaveBeenCalledTimes(1);
    });
  });

  describe('failed state', () => {
    const renderAndTriggerError = async () => {
      let capturedErrorCb: (() => void) | null = null;
      mockOnUpdateError.mockImplementation((cb: () => void) => {
        capturedErrorCb = cb;
        return () => {};
      });

      render(<UpdateAvailableModal isOpen={true} onClose={() => {}} />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Update & Relaunch' }),
        );
      });

      await act(async () => {
        capturedErrorCb?.();
      });
    };

    it('transitions to failed state when onUpdateError fires', async () => {
      await renderAndTriggerError();

      expect(screen.getByText('Download Failed')).toBeInTheDocument();
    });

    it('renders Try Again button in failed state', async () => {
      await renderAndTriggerError();

      expect(
        screen.getByRole('button', { name: 'Try Again' }),
      ).toBeInTheDocument();
    });

    it('Try Again re-invokes downloadUpdate and returns to downloading state', async () => {
      await renderAndTriggerError();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
      });

      expect(mockDownloadUpdate).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Downloading Update')).toBeInTheDocument();
    });

    it('stays in failed state when Try Again downloadUpdate rejects', async () => {
      await renderAndTriggerError();

      mockDownloadUpdate.mockRejectedValue(new Error('IPC error'));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
      });

      expect(screen.getByText('Download Failed')).toBeInTheDocument();
    });

    it('renders DOWNLOAD_URL fallback button in failed state', async () => {
      await renderAndTriggerError();

      fireEvent.click(
        screen.getByRole('button', { name: 'Download from pearl.you' }),
      );

      expect(windowOpenSpy).toHaveBeenCalledWith(DOWNLOAD_URL, '_blank');
    });
  });
});
