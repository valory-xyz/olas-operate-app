import { renderHook } from '@testing-library/react';
import type { UploadFile } from 'antd';
import { act } from 'react';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({ providers: [] }));

const mockMainLogs = {
  debugData: { services: null, addresses: null, balances: null },
};
const mockFallbackLogs = {
  debugData: { services: null, wallets: [], balances: [] },
};

jest.mock('../../../components/SupportModal/useFallbackLogs', () => ({
  useFallbackLogs: () => mockFallbackLogs,
}));

const mockSaveLogsForSupport = jest.fn();
const mockReadFile = jest.fn();

// These values control what useElectronApi returns.
// Tests can set them to `undefined` before rendering to simulate missing APIs.
let electronApiSaveLogsForSupport: typeof mockSaveLogsForSupport | undefined =
  mockSaveLogsForSupport;
let electronApiReadFile: typeof mockReadFile | undefined = mockReadFile;
let logsReturnValue: unknown = mockMainLogs;

jest.mock('../../../hooks', () => ({
  useLogs: () => logsReturnValue,
  useElectronApi: () => ({
    saveLogsForSupport: electronApiSaveLogsForSupport,
    readFile: electronApiReadFile,
  }),
}));

const mockSupportUploadFile = jest.fn();
jest.mock('../../../service/Support', () => ({
  SupportService: {
    uploadFile: (...args: unknown[]) => mockSupportUploadFile(...args),
  },
}));

const mockFormatAttachments = jest.fn();
jest.mock('../../../components/SupportModal/utils', () => ({
  formatAttachments: (...args: unknown[]) => mockFormatAttachments(...args),
}));

// ---------------------------------------------------------------------------
// Import hook after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
const {
  useUploadSupportFiles,
} = require('../../../components/SupportModal/useUploadSupportFiles');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FileDetails = {
  fileName: string;
  fileContent: string;
  mimeType: string;
};

const makeFileDetails = (name: string): FileDetails => ({
  fileName: name,
  fileContent: 'base64content',
  mimeType: 'text/plain',
});

const makeAntdUploadFile = (name: string): UploadFile => ({
  uid: `uid-${name}`,
  name,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useUploadSupportFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset control variables to defaults
    electronApiSaveLogsForSupport = mockSaveLogsForSupport;
    electronApiReadFile = mockReadFile;
    logsReturnValue = mockMainLogs;

    mockSaveLogsForSupport.mockResolvedValue({
      success: true,
      filePath: '/tmp/logs.json',
    });
    mockReadFile.mockResolvedValue({
      success: true,
      fileName: 'logs.json',
      fileContent: '{}',
      mimeType: 'application/json',
    });
    mockFormatAttachments.mockResolvedValue([]);
    mockSupportUploadFile.mockResolvedValue({
      success: true,
      token: 'tok-abc',
    });
  });

  describe('log source selection', () => {
    it('uses fallback logs when shouldUseFallbackLogs is true', async () => {
      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: true }),
      );

      await act(async () => {
        await result.current.uploadFiles([], true);
      });

      expect(mockSaveLogsForSupport).toHaveBeenCalledWith(mockFallbackLogs);
    });

    it('uses main logs when shouldUseFallbackLogs is false', async () => {
      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      await act(async () => {
        await result.current.uploadFiles([], true);
      });

      expect(mockSaveLogsForSupport).toHaveBeenCalledWith(mockMainLogs);
    });

    it('defaults to main logs when shouldUseFallbackLogs is not provided', async () => {
      const { result } = renderHook(() => useUploadSupportFiles({}));

      await act(async () => {
        await result.current.uploadFiles([], true);
      });

      expect(mockSaveLogsForSupport).toHaveBeenCalledWith(mockMainLogs);
    });
  });

  describe('loadLogsFile (via uploadFiles with shouldIncludeLogs=true)', () => {
    it('returns null when logs are falsy', async () => {
      logsReturnValue = null;

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.uploadFiles([], true);
      });

      expect(mockSaveLogsForSupport).not.toHaveBeenCalled();
      expect(tokens).toEqual([]);
    });

    it('returns null when saveLogsForSupport is undefined', async () => {
      electronApiSaveLogsForSupport = undefined;

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.uploadFiles([], true);
      });

      expect(mockSaveLogsForSupport).not.toHaveBeenCalled();
      expect(tokens).toEqual([]);
    });

    it('returns null when readFile is undefined', async () => {
      electronApiReadFile = undefined;

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.uploadFiles([], true);
      });

      expect(mockSaveLogsForSupport).not.toHaveBeenCalled();
      expect(tokens).toEqual([]);
    });

    it('returns null when saveLogsForSupport fails', async () => {
      mockSaveLogsForSupport.mockResolvedValue({ success: false });

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.uploadFiles([], true);
      });

      expect(mockSaveLogsForSupport).toHaveBeenCalled();
      expect(mockReadFile).not.toHaveBeenCalled();
      expect(tokens).toEqual([]);
    });

    it('returns null when readFile fails', async () => {
      mockReadFile.mockResolvedValue({
        success: false,
        error: 'Disk full',
      });

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.uploadFiles([], true);
      });

      expect(mockReadFile).toHaveBeenCalledWith('/tmp/logs.json');
      expect(tokens).toEqual([]);
    });

    it('returns file details on successful log loading', async () => {
      const logFileResult = {
        success: true,
        fileName: 'logs.json',
        fileContent: '{"data":"test"}',
        mimeType: 'application/json',
      };
      mockReadFile.mockResolvedValue(logFileResult);

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      await act(async () => {
        await result.current.uploadFiles([], true);
      });

      expect(mockSupportUploadFile).toHaveBeenCalledWith(logFileResult);
    });
  });

  describe('uploadFile (single file via uploadFiles)', () => {
    it('returns token on successful upload', async () => {
      const attachment = makeFileDetails('screenshot.png');
      mockFormatAttachments.mockResolvedValue([attachment]);
      mockSupportUploadFile.mockResolvedValue({
        success: true,
        token: 'tok-123',
      });

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.uploadFiles(
          [makeAntdUploadFile('screenshot.png')],
          false,
        );
      });

      expect(mockSupportUploadFile).toHaveBeenCalledWith(attachment);
      expect(tokens).toEqual(['tok-123']);
    });

    it('filters out failed upload tokens', async () => {
      const attachment = makeFileDetails('bad.png');
      mockFormatAttachments.mockResolvedValue([attachment]);
      mockSupportUploadFile.mockResolvedValue({
        success: false,
        error: 'Server error',
      });

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.uploadFiles(
          [makeAntdUploadFile('bad.png')],
          false,
        );
      });

      expect(tokens).toEqual([]);
    });

    it('filters out tokens when upload throws an exception', async () => {
      const attachment = makeFileDetails('crash.png');
      mockFormatAttachments.mockResolvedValue([attachment]);
      mockSupportUploadFile.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.uploadFiles(
          [makeAntdUploadFile('crash.png')],
          false,
        );
      });

      expect(tokens).toEqual([]);
    });
  });

  describe('uploadFiles', () => {
    it('combines attachments and logs file for upload', async () => {
      const attachment = makeFileDetails('doc.pdf');
      const logFileResult = {
        success: true,
        fileName: 'logs.json',
        fileContent: '{}',
        mimeType: 'application/json',
      };

      mockFormatAttachments.mockResolvedValue([attachment]);
      mockReadFile.mockResolvedValue(logFileResult);
      mockSupportUploadFile
        .mockResolvedValueOnce({ success: true, token: 'tok-attach' })
        .mockResolvedValueOnce({ success: true, token: 'tok-logs' });

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.uploadFiles(
          [makeAntdUploadFile('doc.pdf')],
          true,
        );
      });

      expect(mockSupportUploadFile).toHaveBeenCalledTimes(2);
      expect(mockSupportUploadFile).toHaveBeenCalledWith(attachment);
      expect(mockSupportUploadFile).toHaveBeenCalledWith(logFileResult);
      expect(tokens).toEqual(['tok-attach', 'tok-logs']);
    });

    it('skips logs file when shouldIncludeLogs is false', async () => {
      const attachment = makeFileDetails('file.txt');
      mockFormatAttachments.mockResolvedValue([attachment]);
      mockSupportUploadFile.mockResolvedValue({
        success: true,
        token: 'tok-only',
      });

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.uploadFiles(
          [makeAntdUploadFile('file.txt')],
          false,
        );
      });

      expect(mockSaveLogsForSupport).not.toHaveBeenCalled();
      expect(mockSupportUploadFile).toHaveBeenCalledTimes(1);
      expect(tokens).toEqual(['tok-only']);
    });

    it('filters out null tokens from mixed results', async () => {
      const attachment1 = makeFileDetails('ok.txt');
      const attachment2 = makeFileDetails('fail.txt');

      mockFormatAttachments.mockResolvedValue([attachment1, attachment2]);
      mockSupportUploadFile
        .mockResolvedValueOnce({ success: true, token: 'tok-ok' })
        .mockResolvedValueOnce({ success: false, error: 'Failed' });

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.uploadFiles(
          [makeAntdUploadFile('ok.txt'), makeAntdUploadFile('fail.txt')],
          false,
        );
      });

      expect(tokens).toEqual(['tok-ok']);
    });

    it('returns empty array when all uploads fail', async () => {
      const attachment = makeFileDetails('fail.txt');
      mockFormatAttachments.mockResolvedValue([attachment]);
      mockSupportUploadFile.mockResolvedValue({
        success: false,
        error: 'Server down',
      });

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.uploadFiles(
          [makeAntdUploadFile('fail.txt')],
          false,
        );
      });

      expect(tokens).toEqual([]);
    });

    it('returns empty array when no files and no logs', async () => {
      mockFormatAttachments.mockResolvedValue([]);

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.uploadFiles([], false);
      });

      expect(mockSupportUploadFile).not.toHaveBeenCalled();
      expect(tokens).toEqual([]);
    });

    it('passes antd UploadFile array to formatAttachments', async () => {
      mockFormatAttachments.mockResolvedValue([]);
      const uploadFiles = [
        makeAntdUploadFile('a.txt'),
        makeAntdUploadFile('b.txt'),
      ];

      const { result } = renderHook(() =>
        useUploadSupportFiles({ shouldUseFallbackLogs: false }),
      );

      await act(async () => {
        await result.current.uploadFiles(uploadFiles, false);
      });

      expect(mockFormatAttachments).toHaveBeenCalledWith(uploadFiles);
    });
  });
});
