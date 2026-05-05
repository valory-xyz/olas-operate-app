import type { UploadFile } from 'antd';

import {
  formatAttachments,
  formatFileSize,
} from '../../../components/SupportModal/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock UploadFile with an attached File (originFileObj).
 * The File is constructed from the given content string.
 */
const makeUploadFile = (
  name: string,
  content: string,
  mimeType: string,
): UploadFile => {
  const blob = new File([content], name, { type: mimeType });
  return {
    uid: `uid-${name}`,
    name,
    type: mimeType,
    originFileObj: blob as UploadFile['originFileObj'],
  };
};

/**
 * Creates a mock UploadFile WITHOUT an originFileObj.
 */
const makeUploadFileWithoutOrigin = (name: string): UploadFile => ({
  uid: `uid-${name}`,
  name,
});

// ---------------------------------------------------------------------------
// formatFileSize
// ---------------------------------------------------------------------------

describe('formatFileSize', () => {
  it('returns "Unknown size" when bytes is undefined', () => {
    expect(formatFileSize(undefined)).toBe('Unknown size');
  });

  it('returns "Unknown size" when bytes is 0', () => {
    expect(formatFileSize(0)).toBe('Unknown size');
  });

  it('formats bytes below 1 KB as B', () => {
    expect(formatFileSize(1)).toBe('1 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats bytes at the KB boundary', () => {
    expect(formatFileSize(1024)).toBe('1.00 KB');
  });

  it('formats bytes in the KB range', () => {
    expect(formatFileSize(1536)).toBe('1.50 KB');
    expect(formatFileSize(10240)).toBe('10.00 KB');
    expect(formatFileSize(1024 * 1024 - 1)).toBe('1024.00 KB');
  });

  it('formats bytes at the MB boundary', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
  });

  it('formats bytes in the MB range', () => {
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.50 MB');
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10.00 MB');
    expect(formatFileSize(100 * 1024 * 1024)).toBe('100.00 MB');
  });
});

// ---------------------------------------------------------------------------
// formatAttachments
// ---------------------------------------------------------------------------

describe('formatAttachments', () => {
  it('returns an empty array when given an empty files array', async () => {
    const result = await formatAttachments([]);
    expect(result).toEqual([]);
  });

  it('filters out files without originFileObj', async () => {
    const fileWithoutOrigin = makeUploadFileWithoutOrigin('orphan.txt');
    const result = await formatAttachments([fileWithoutOrigin]);
    expect(result).toEqual([]);
  });

  it('reads a single file and returns its details', async () => {
    const textContent = 'Hello, world!';
    const uploadFile = makeUploadFile('test.txt', textContent, 'text/plain');

    const result = await formatAttachments([uploadFile]);

    expect(result).toHaveLength(1);
    expect(result[0].fileName).toBe('test.txt');
    expect(result[0].mimeType).toBe('text/plain');
    // FileReader.readAsDataURL produces a data URL
    expect(result[0].fileContent).toContain('data:');
  });

  it('reads multiple files and returns all details', async () => {
    const fileA = makeUploadFile('a.txt', 'content A', 'text/plain');
    const fileB = makeUploadFile(
      'b.json',
      '{"key":"value"}',
      'application/json',
    );

    const result = await formatAttachments([fileA, fileB]);

    expect(result).toHaveLength(2);

    const fileNames = result.map((f) => f.fileName);
    expect(fileNames).toContain('a.txt');
    expect(fileNames).toContain('b.json');

    const fileBResult = result.find((f) => f.fileName === 'b.json');
    expect(fileBResult?.mimeType).toBe('application/json');
  });

  it('filters out files without originFileObj among valid files', async () => {
    const validFile = makeUploadFile('valid.txt', 'valid', 'text/plain');
    const orphanFile = makeUploadFileWithoutOrigin('orphan.txt');

    const result = await formatAttachments([validFile, orphanFile]);

    expect(result).toHaveLength(1);
    expect(result[0].fileName).toBe('valid.txt');
  });

  it('defaults mimeType to application/octet-stream when type is missing', async () => {
    const uploadFile = makeUploadFile('binary.bin', 'binary data', '');
    // Remove the type from the UploadFile so the fallback kicks in
    delete (uploadFile as Partial<Pick<UploadFile, 'type'>>).type;

    const result = await formatAttachments([uploadFile]);

    expect(result).toHaveLength(1);
    expect(result[0].mimeType).toBe('application/octet-stream');
  });

  it('rejects when FileReader encounters an error', async () => {
    const uploadFile = makeUploadFile('fail.txt', 'content', 'text/plain');

    // Replace the global FileReader with one that immediately errors
    const OriginalFileReader = globalThis.FileReader;
    const mockFileReader = {
      readAsDataURL: jest.fn(),
      onerror: null as null | (() => void),
      onload: null as null | (() => void),
      result: null,
    };
    globalThis.FileReader = jest.fn(
      () => mockFileReader,
    ) as unknown as typeof FileReader;

    const promise = formatAttachments([uploadFile]);

    // Trigger the error callback
    mockFileReader.onerror!();

    await expect(promise).rejects.toThrow('Failed to read file fail.txt');

    // Restore
    globalThis.FileReader = OriginalFileReader;
  });
});
