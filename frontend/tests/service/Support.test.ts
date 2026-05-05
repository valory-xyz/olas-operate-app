import { SUPPORT_API_URL } from '../../constants/urls';
import { SupportService } from '../../service/Support';

jest.mock('../../utils/error', () => ({
  ...jest.requireActual('../../utils/error'),
  parseApiError: jest.fn(),
}));

const { parseApiError: mockParseApiError } = jest.requireMock(
  '../../utils/error',
) as { parseApiError: jest.Mock };

const mockJsonResponse = (body: unknown, ok = true) =>
  Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
  } as Response);

beforeEach(() => {
  global.fetch = jest.fn();
  // By default, parseApiError throws (matching real behavior)
  mockParseApiError.mockRejectedValue(new Error('API error'));
});

describe('SupportService', () => {
  describe('uploadFile', () => {
    const fileParams = {
      fileName: 'log.txt',
      fileContent: 'some log content',
      mimeType: 'text/plain',
    };

    it('posts to the correct URL with mapped body fields', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ upload: { token: 'tok-123' } }));

      await SupportService.uploadFile(fileParams);

      expect(fetch).toHaveBeenCalledWith(`${SUPPORT_API_URL}/upload-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'log.txt',
          fileData: 'some log content',
          contentType: 'text/plain',
        }),
      });
    });

    it('returns success with token on ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ upload: { token: 'tok-456' } }));

      const result = await SupportService.uploadFile(fileParams);
      expect(result).toEqual({ success: true, token: 'tok-456' });
    });

    it('returns failure on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ error: 'File too large' }, false));

      const result = await SupportService.uploadFile(fileParams);
      expect(result.success).toBe(false);
    });

    it('returns failure with generic error when fetch throws', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const result = await SupportService.uploadFile(fileParams);
      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });
    });

    it('returns fallback error message for non-Error throws', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue('string error');

      const result = await SupportService.uploadFile(fileParams);
      expect(result).toEqual({
        success: false,
        error: 'Failed to upload file',
      });
    });
  });

  describe('createTicket', () => {
    const ticketParams = {
      email: 'user@example.com',
      subject: 'Bug report',
      description: 'Agent stuck in deploying state',
      uploadTokens: ['tok-123'],
      tags: ['pearl' as const, 'support' as const],
    };

    it('posts to the correct URL with full body', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ ticket: { id: 42 } }));

      await SupportService.createTicket(ticketParams);

      expect(fetch).toHaveBeenCalledWith(`${SUPPORT_API_URL}/create-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketParams),
      });
    });

    it('returns success with ticketId on ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ ticket: { id: 99 } }));

      const result = await SupportService.createTicket(ticketParams);
      expect(result).toEqual({ success: true, ticketId: 99 });
    });

    it('sends minimal body when optional fields are omitted', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ ticket: { id: 1 } }));

      const minimal = {
        subject: 'Help',
        description: 'Need help',
      };
      await SupportService.createTicket(minimal);

      expect(fetch).toHaveBeenCalledWith(
        `${SUPPORT_API_URL}/create-ticket`,
        expect.objectContaining({
          body: JSON.stringify(minimal),
        }),
      );
    });

    it('returns failure with API error message on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ error: 'Rate limited' }, false));

      const result = await SupportService.createTicket(ticketParams);
      expect(result.success).toBe(false);
    });

    it('returns failure with generic error when fetch throws', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockRejectedValue(new Error('Connection refused'));

      const result = await SupportService.createTicket(ticketParams);
      expect(result).toEqual({
        success: false,
        error: 'Connection refused',
      });
    });

    it('returns fallback error message for non-Error throws', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(42);

      const result = await SupportService.createTicket(ticketParams);
      expect(result).toEqual({
        success: false,
        error: 'Failed to create ticket',
      });
    });
  });

  describe('uploadFile – parseApiError branch', () => {
    const fileParams = {
      fileName: 'log.txt',
      fileContent: 'some log content',
      mimeType: 'text/plain',
    };

    it('calls parseApiError and surfaces the API error message on non-ok response', async () => {
      mockParseApiError.mockRejectedValue(new Error('Payload too large'));
      jest.spyOn(global, 'fetch').mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Payload too large' }),
        } as Response),
      );

      const result = await SupportService.uploadFile(fileParams);
      expect(result).toEqual({
        success: false,
        error: 'Payload too large',
      });
    });

    it('uses fallback message when parseApiError response has no error or message field', async () => {
      mockParseApiError.mockRejectedValue(new Error('Failed to upload file'));
      jest.spyOn(global, 'fetch').mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        } as Response),
      );

      const result = await SupportService.uploadFile(fileParams);
      expect(result).toEqual({
        success: false,
        error: 'Failed to upload file',
      });
    });

    it('falls through when parseApiError resolves without throwing', async () => {
      mockParseApiError.mockResolvedValue(undefined);
      jest.spyOn(global, 'fetch').mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ upload: { token: 'tok-recover' } }),
        } as Response),
      );

      const result = await SupportService.uploadFile(fileParams);
      expect(result).toEqual({ success: true, token: 'tok-recover' });
    });
  });

  describe('createTicket – parseApiError branch', () => {
    const ticketParams = {
      subject: 'Test',
      description: 'Test description',
    };

    it('calls parseApiError and surfaces the API error message on non-ok response', async () => {
      mockParseApiError.mockRejectedValue(new Error('Invalid email'));
      jest.spyOn(global, 'fetch').mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 422,
          json: () => Promise.resolve({ error: 'Invalid email' }),
        } as Response),
      );

      const result = await SupportService.createTicket(ticketParams);
      expect(result).toEqual({
        success: false,
        error: 'Invalid email',
      });
    });

    it('uses fallback message when parseApiError response has no error or message field', async () => {
      mockParseApiError.mockRejectedValue(new Error('Failed to create ticket'));
      jest.spyOn(global, 'fetch').mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        } as Response),
      );

      const result = await SupportService.createTicket(ticketParams);
      expect(result).toEqual({
        success: false,
        error: 'Failed to create ticket',
      });
    });

    it('falls through when parseApiError resolves without throwing', async () => {
      mockParseApiError.mockResolvedValue(undefined);
      jest.spyOn(global, 'fetch').mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 422,
          json: () => Promise.resolve({ ticket: { id: 77 } }),
        } as Response),
      );

      const result = await SupportService.createTicket(ticketParams);
      expect(result).toEqual({ success: true, ticketId: 77 });
    });
  });
});
