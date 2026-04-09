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

const mockStoreGet = jest.fn();
const mockStoreSet = jest.fn();
const mockUseElectronApi = jest.fn();
jest.mock('../../../../hooks', () => ({
  useElectronApi: (...args: unknown[]) => mockUseElectronApi(...args),
}));

// useToggle mock — we control the open state and capture toggleOpen calls
let mockOpen: boolean;
const mockToggleOpen = jest.fn();
jest.mock('usehooks-ts', () => ({
  useToggle: jest.fn(() => [mockOpen, mockToggleOpen]),
}));

jest.mock('next/image', () => {
  const MockImage = (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  );
  MockImage.displayName = 'MockImage';
  return { __esModule: true, default: MockImage };
});

jest.mock('../../../../components/ui', () => ({
  Modal: (props: {
    title: string;
    description: string;
    footer: React.ReactNode;
    header: React.ReactNode;
    onCancel: () => void;
  }) => (
    <div data-testid="modal">
      <div data-testid="modal-header">{props.header}</div>
      <div data-testid="modal-title">{props.title}</div>
      <div data-testid="modal-description">{props.description}</div>
      <div data-testid="modal-footer">{props.footer}</div>
    </div>
  ),
}));

// --- Helpers ---

const defaultAppStatusOutdated = {
  data: { isOutdated: true, latestTag: 'v2.0.0' },
  isFetched: true,
};

// --- Tests ---

describe('UpdateAvailableModal', () => {
  let windowOpenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpen = false;
    mockStoreGet.mockResolvedValue(undefined);
    mockUseAppStatus.mockReturnValue(defaultAppStatusOutdated);
    mockUseElectronApi.mockReturnValue({
      store: { get: mockStoreGet, set: mockStoreSet },
    });
    windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  describe('returns null when modal is not open', () => {
    it('renders nothing when open is false', () => {
      mockOpen = false;
      const { container } = render(<UpdateAvailableModal />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('useEffect logic', () => {
    it('does nothing when isFetched is false', async () => {
      mockUseAppStatus.mockReturnValue({
        data: { isOutdated: true, latestTag: 'v2.0.0' },
        isFetched: false,
      });

      await act(async () => {
        render(<UpdateAvailableModal />);
      });

      expect(mockStoreGet).not.toHaveBeenCalled();
      expect(mockToggleOpen).not.toHaveBeenCalled();
    });

    it('does nothing when latestTag is null', async () => {
      mockUseAppStatus.mockReturnValue({
        data: { isOutdated: true, latestTag: null },
        isFetched: true,
      });

      await act(async () => {
        render(<UpdateAvailableModal />);
      });

      expect(mockStoreGet).not.toHaveBeenCalled();
      expect(mockToggleOpen).not.toHaveBeenCalled();
    });

    it('does nothing when data.isOutdated is false', async () => {
      mockUseAppStatus.mockReturnValue({
        data: { isOutdated: false, latestTag: 'v2.0.0' },
        isFetched: true,
      });

      await act(async () => {
        render(<UpdateAvailableModal />);
      });

      expect(mockStoreGet).not.toHaveBeenCalled();
      expect(mockToggleOpen).not.toHaveBeenCalled();
    });

    it('does nothing when store.get is not available', async () => {
      mockUseElectronApi.mockReturnValue({
        store: { get: undefined, set: undefined },
      });

      await act(async () => {
        render(<UpdateAvailableModal />);
      });

      expect(mockStoreGet).not.toHaveBeenCalled();
      expect(mockToggleOpen).not.toHaveBeenCalled();
    });

    it('opens modal when store returns a different dismissed version', async () => {
      mockStoreGet.mockResolvedValue('v1.0.0'); // different from v2.0.0

      await act(async () => {
        render(<UpdateAvailableModal />);
      });

      expect(mockStoreGet).toHaveBeenCalledWith('updateAvailableKnownVersion');
      expect(mockToggleOpen).toHaveBeenCalled();
    });

    it('opens modal when store returns undefined (never dismissed)', async () => {
      mockStoreGet.mockResolvedValue(undefined);

      await act(async () => {
        render(<UpdateAvailableModal />);
      });

      expect(mockStoreGet).toHaveBeenCalledWith('updateAvailableKnownVersion');
      expect(mockToggleOpen).toHaveBeenCalled();
    });

    it('does NOT open modal when store returns the same version as latestTag', async () => {
      mockStoreGet.mockResolvedValue('v2.0.0'); // same as latestTag

      await act(async () => {
        render(<UpdateAvailableModal />);
      });

      expect(mockStoreGet).toHaveBeenCalledWith('updateAvailableKnownVersion');
      expect(mockToggleOpen).not.toHaveBeenCalled();
    });

    it('logs console.error when store.get rejects', async () => {
      const storeError = new Error('store read failure');
      mockStoreGet.mockRejectedValue(storeError);

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await act(async () => {
        render(<UpdateAvailableModal />);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to check update availability:',
        storeError,
      );

      consoleSpy.mockRestore();
    });
  });

  describe('render when open', () => {
    beforeEach(() => {
      mockOpen = true;
    });

    it('renders modal with "Update Available" title', () => {
      render(<UpdateAvailableModal />);
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent(
        'Update Available',
      );
    });

    it('renders "Update Later" button', () => {
      render(<UpdateAvailableModal />);
      expect(
        screen.getByRole('button', { name: 'Update Later' }),
      ).toBeInTheDocument();
    });

    it('renders "Download on pearl.you" button', () => {
      render(<UpdateAvailableModal />);
      expect(
        screen.getByRole('button', { name: 'Download on pearl.you' }),
      ).toBeInTheDocument();
    });

    it('renders Pearl image with correct attributes', () => {
      render(<UpdateAvailableModal />);
      const img = screen.getByAltText('Pearl');
      expect(img).toHaveAttribute('src', '/pearl-with-gradient.png');
      expect(img).toHaveAttribute('width', '40');
      expect(img).toHaveAttribute('height', '40');
    });

    it('renders description text', () => {
      render(<UpdateAvailableModal />);
      expect(screen.getByTestId('modal-description')).toHaveTextContent(
        'An updated version of Pearl just released.',
      );
    });
  });

  describe('onUpdateLater', () => {
    beforeEach(() => {
      mockOpen = true;
    });

    it('calls store.set with latestTag and toggles modal closed', () => {
      render(<UpdateAvailableModal />);

      fireEvent.click(screen.getByRole('button', { name: 'Update Later' }));

      expect(mockStoreSet).toHaveBeenCalledWith(
        'updateAvailableKnownVersion',
        'v2.0.0',
      );
      expect(mockToggleOpen).toHaveBeenCalled();
    });

    it('does not call store.set when latestTag is null', () => {
      mockUseAppStatus.mockReturnValue({
        data: { isOutdated: true, latestTag: null },
        isFetched: true,
      });

      render(<UpdateAvailableModal />);

      fireEvent.click(screen.getByRole('button', { name: 'Update Later' }));

      expect(mockStoreSet).not.toHaveBeenCalled();
      expect(mockToggleOpen).toHaveBeenCalled();
    });
  });

  describe('onDownload', () => {
    beforeEach(() => {
      mockOpen = true;
    });

    it('calls window.open with DOWNLOAD_URL and toggles modal closed', () => {
      render(<UpdateAvailableModal />);

      fireEvent.click(
        screen.getByRole('button', { name: 'Download on pearl.you' }),
      );

      expect(windowOpenSpy).toHaveBeenCalledWith(DOWNLOAD_URL, '_blank');
      expect(mockToggleOpen).toHaveBeenCalled();
    });
  });
});
