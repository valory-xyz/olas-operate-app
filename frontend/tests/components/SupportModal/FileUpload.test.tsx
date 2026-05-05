import { fireEvent, render, screen } from '@testing-library/react';
import { Upload, UploadFile } from 'antd';

// Import after mocks
import { FileUploadWithList } from '../../../components/SupportModal/FileUpload';
import { formatFileSize } from '../../../components/SupportModal/utils';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockMessageError = jest.fn();

// Capture the beforeUpload prop from Upload.Dragger so we can call it directly
let capturedBeforeUpload:
  | ((file: { size: number }, addedFileList: { size: number }[]) => unknown)
  | null = null;
let capturedDraggerProps: Record<string, unknown> = {};

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    message: {
      ...actual.message,
      error: (...args: unknown[]) => mockMessageError(...args),
    },
    Upload: {
      ...actual.Upload,
      Dragger: (props: Record<string, unknown>) => {
        capturedBeforeUpload =
          props.beforeUpload as typeof capturedBeforeUpload;
        capturedDraggerProps = props;
        return (
          <div data-testid="upload-dragger" data-accept={props.accept}>
            {props.children as React.ReactNode}
          </div>
        );
      },
    },
  };
});

jest.mock('../../../components/SupportModal/utils', () => ({
  formatFileSize: jest.fn((size?: number) => {
    if (!size) return 'Unknown size';
    return `${size} bytes`;
  }),
}));

jest.mock('react-icons/tb', () => ({
  TbCloudUpload: (props: Record<string, unknown>) => (
    <div data-testid="cloud-upload-icon" {...props} />
  ),
  TbPaperclip: (props: Record<string, unknown>) => (
    <div data-testid="paperclip-icon" {...props} />
  ),
  TbTrash: (props: Record<string, unknown>) => (
    <div data-testid="trash-icon" {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MB = 1024 * 1024;

const makeFile = (size: number) => ({ size });

const makeUploadFile = (
  uid: string,
  name: string,
  size?: number,
): UploadFile => ({
  uid,
  name,
  size,
});

// ---------------------------------------------------------------------------
// Tests: beforeUpload logic
// ---------------------------------------------------------------------------

describe('beforeUpload validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedBeforeUpload = null;
    render(<FileUploadWithList onChange={jest.fn()} uploadedFiles={[]} />);
  });

  it('returns false (allow) for a valid file within limits', () => {
    const result = capturedBeforeUpload!(makeFile(1 * MB), [makeFile(1 * MB)]);
    expect(result).toBe(false);
  });

  it('returns Upload.LIST_IGNORE when total files exceed MAX_FILES', () => {
    const currentFiles = Array.from({ length: 4 }, (_, i) =>
      makeUploadFile(`uid-${i}`, `file-${i}.png`, 1024),
    );

    // Re-render with 4 existing files
    render(
      <FileUploadWithList onChange={jest.fn()} uploadedFiles={currentFiles} />,
    );

    // Adding 2 more = 6 total > 5
    const addedFiles = [makeFile(1024), makeFile(1024)];
    const result = capturedBeforeUpload!(makeFile(1024), addedFiles);
    expect(result).toBe(Upload.LIST_IGNORE);
  });

  it('shows "Too Many Files" error message when exceeding MAX_FILES', () => {
    const currentFiles = Array.from({ length: 5 }, (_, i) =>
      makeUploadFile(`uid-${i}`, `file-${i}.png`, 1024),
    );

    render(
      <FileUploadWithList onChange={jest.fn()} uploadedFiles={currentFiles} />,
    );

    const addedFiles = [makeFile(1024)];
    capturedBeforeUpload!(makeFile(1024), addedFiles);
    expect(mockMessageError).toHaveBeenCalledWith({
      content: 'Too Many Files',
      key: 'max-files-error',
    });
  });

  it('returns Upload.LIST_IGNORE when file size exceeds MAX_FILE_SIZE_MB', () => {
    const oversizedFile = makeFile(5 * MB);
    const result = capturedBeforeUpload!(oversizedFile, [oversizedFile]);
    expect(result).toBe(Upload.LIST_IGNORE);
  });

  it('shows "File Too Large" error message when exceeding size limit', () => {
    const oversizedFile = makeFile(5 * MB);
    capturedBeforeUpload!(oversizedFile, [oversizedFile]);
    expect(mockMessageError).toHaveBeenCalledWith({
      content: 'File Too Large',
      key: 'file-size-error',
    });
  });

  it('allows exactly 5 total files but rejects 6', () => {
    // Exactly 5: 3 existing + 2 added = 5
    const threeExisting = Array.from({ length: 3 }, (_, i) =>
      makeUploadFile(`uid-${i}`, `file-${i}.png`, 1024),
    );

    render(
      <FileUploadWithList onChange={jest.fn()} uploadedFiles={threeExisting} />,
    );

    const twoAdded = [makeFile(1024), makeFile(1024)];
    const allowResult = capturedBeforeUpload!(makeFile(1024), twoAdded);
    expect(allowResult).toBe(false);

    // Now 4 existing + 2 added = 6 => reject
    const fourExisting = Array.from({ length: 4 }, (_, i) =>
      makeUploadFile(`uid-${i}`, `file-${i}.png`, 1024),
    );

    render(
      <FileUploadWithList onChange={jest.fn()} uploadedFiles={fourExisting} />,
    );

    const rejectResult = capturedBeforeUpload!(makeFile(1024), twoAdded);
    expect(rejectResult).toBe(Upload.LIST_IGNORE);
  });

  it('allows exactly 4.5MB but rejects slightly over', () => {
    const exactLimit = makeFile(4.5 * MB);
    const exactResult = capturedBeforeUpload!(exactLimit, [exactLimit]);
    expect(exactResult).toBe(false);

    const slightlyOver = makeFile(4.5 * MB + 1);
    const overResult = capturedBeforeUpload!(slightlyOver, [slightlyOver]);
    expect(overResult).toBe(Upload.LIST_IGNORE);
  });
});

// ---------------------------------------------------------------------------
// Tests: FileUpload component (rendered via FileUploadWithList)
// ---------------------------------------------------------------------------

describe('FileUpload component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedDraggerProps = {};
  });

  it('renders upload instruction text', () => {
    render(<FileUploadWithList onChange={jest.fn()} />);
    expect(
      screen.getByText('Upload screenshots of the issue'),
    ).toBeInTheDocument();
  });

  it('renders file limits text', () => {
    render(<FileUploadWithList onChange={jest.fn()} />);
    expect(screen.getByText('Max 5 files, 4.5MB each.')).toBeInTheDocument();
  });

  it('accepts correct file types', () => {
    render(<FileUploadWithList onChange={jest.fn()} />);
    const expectedTypes =
      'image/*,video/*,.zip,application/zip,application/x-zip-compressed';
    expect(capturedDraggerProps.accept).toBe(expectedTypes);
  });
});

// ---------------------------------------------------------------------------
// Tests: UploadedFilesList (rendered via FileUploadWithList)
// ---------------------------------------------------------------------------

describe('UploadedFilesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when uploadedFiles is empty', () => {
    const { container } = render(
      <FileUploadWithList onChange={jest.fn()} uploadedFiles={[]} />,
    );
    // No file names, no remove buttons
    expect(screen.queryAllByRole('button', { name: /Remove/i })).toHaveLength(
      0,
    );
    // Only the dragger area should be present
    expect(
      container.querySelector('[data-testid="upload-dragger"]'),
    ).toBeInTheDocument();
  });

  it('renders file names for each uploaded file', () => {
    const files = [
      makeUploadFile('uid-1', 'screenshot.png', 1024),
      makeUploadFile('uid-2', 'video.mp4', 2048),
    ];

    render(<FileUploadWithList onChange={jest.fn()} uploadedFiles={files} />);

    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    expect(screen.getByText('video.mp4')).toBeInTheDocument();
  });

  it('renders formatted file sizes via formatFileSize', () => {
    const files = [
      makeUploadFile('uid-1', 'screenshot.png', 1024),
      makeUploadFile('uid-2', 'video.mp4', 2048),
    ];

    render(<FileUploadWithList onChange={jest.fn()} uploadedFiles={files} />);

    expect(formatFileSize).toHaveBeenCalledWith(1024);
    expect(formatFileSize).toHaveBeenCalledWith(2048);
    expect(screen.getByText('(1024 bytes)')).toBeInTheDocument();
    expect(screen.getByText('(2048 bytes)')).toBeInTheDocument();
  });

  it('calls onRemoveFile with file uid when remove button is clicked', () => {
    const mockOnRemove = jest.fn();
    const files = [
      makeUploadFile('uid-1', 'screenshot.png', 1024),
      makeUploadFile('uid-2', 'video.mp4', 2048),
    ];

    render(
      <FileUploadWithList
        onChange={jest.fn()}
        uploadedFiles={files}
        onRemoveFile={mockOnRemove}
      />,
    );

    const removeButton = screen.getByRole('button', {
      name: 'Remove screenshot.png',
    });
    fireEvent.click(removeButton);
    expect(mockOnRemove).toHaveBeenCalledWith('uid-1');
  });
});

// ---------------------------------------------------------------------------
// Tests: FileUploadWithList
// ---------------------------------------------------------------------------

describe('FileUploadWithList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedDraggerProps = {};
  });

  it('renders both FileUpload and UploadedFilesList together', () => {
    const files = [makeUploadFile('uid-1', 'screenshot.png', 1024)];

    render(<FileUploadWithList onChange={jest.fn()} uploadedFiles={files} />);

    // FileUpload portion
    expect(screen.getByTestId('upload-dragger')).toBeInTheDocument();
    // UploadedFilesList portion
    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
  });

  it('passes onChange to FileUpload', () => {
    const mockOnChange = jest.fn();
    render(<FileUploadWithList onChange={mockOnChange} />);
    expect(capturedDraggerProps.onChange).toBe(mockOnChange);
  });

  it('defaults uploadedFiles to empty array', () => {
    render(<FileUploadWithList onChange={jest.fn()} />);
    // fileList passed to Upload.Dragger should be empty
    expect(capturedDraggerProps.fileList).toEqual([]);
    // No file entries rendered
    expect(screen.queryAllByRole('button', { name: /Remove/i })).toHaveLength(
      0,
    );
  });
});
