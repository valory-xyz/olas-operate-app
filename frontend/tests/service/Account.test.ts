import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import { BACKEND_URL } from '../../constants/urls';
import { AccountService } from '../../service/Account';

const mockJsonResponse = (body: unknown, ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);

const mockJsonErrorBody = (errorMessage: string) => ({
  error: errorMessage,
});

beforeEach(() => {
  global.fetch = jest.fn();
  jest.restoreAllMocks();
});

describe('AccountService', () => {
  const expectedHeaders = { ...CONTENT_TYPE_JSON_UTF8 };

  describe('getAccount', () => {
    it('returns account status on success', async () => {
      const responseBody = { is_setup: true };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await AccountService.getAccount();
      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/account`, {
        headers: expectedHeaders,
      });
    });

    it('throws generic error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(AccountService.getAccount()).rejects.toThrow(
        'Failed to get account',
      );
    });

    it('returns is_setup: false for new account', async () => {
      const responseBody = { is_setup: false };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await AccountService.getAccount();
      expect(result).toEqual({ is_setup: false });
    });
  });

  describe('createAccount', () => {
    it('returns response on success', async () => {
      const responseBody = { message: 'Account created' };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await AccountService.createAccount('mypassword');
      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/account`, {
        method: 'POST',
        headers: expectedHeaders,
        body: JSON.stringify({ password: 'mypassword' }),
      });
    });

    it('throws parsed API error when password too short (400)', async () => {
      const errorBody = mockJsonErrorBody(
        'Password must be at least 8 characters long',
      );
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(errorBody, false, 400));

      await expect(AccountService.createAccount('short')).rejects.toThrow(
        'Password must be at least 8 characters long',
      );
    });

    it('throws parsed API error when account already exists (409)', async () => {
      const errorBody = mockJsonErrorBody('Account already exists');
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(errorBody, false, 409));

      await expect(AccountService.createAccount('password123')).rejects.toThrow(
        'Account already exists',
      );
    });

    it('throws fallback message when response body has no error field', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(AccountService.createAccount('password123')).rejects.toThrow(
        'Failed to create account',
      );
    });

    it('uses message field if error field is absent', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(
          mockJsonResponse({ message: 'custom message' }, false, 400),
        );

      await expect(AccountService.createAccount('password123')).rejects.toThrow(
        'custom message',
      );
    });
  });

  describe('updateAccount', () => {
    it('sends old and new password and returns response on success', async () => {
      const responseBody = { message: 'Password updated' };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await AccountService.updateAccount(
        'oldpass123',
        'newpass456',
      );
      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/account`, {
        method: 'PUT',
        headers: expectedHeaders,
        body: JSON.stringify({
          old_password: 'oldpass123',
          new_password: 'newpass456',
        }),
      });
    });

    it('throws parsed API error on failure', async () => {
      const errorBody = mockJsonErrorBody('Invalid old password');
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(errorBody, false, 401));

      await expect(
        AccountService.updateAccount('wrongpass', 'newpass456'),
      ).rejects.toThrow('Invalid old password');
    });

    it('throws fallback message when response body is unparseable', async () => {
      jest.spyOn(global, 'fetch').mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error('invalid json')),
        } as Response),
      );

      await expect(AccountService.updateAccount('old', 'new')).rejects.toThrow(
        'Failed to update account',
      );
    });
  });

  describe('loginAccount', () => {
    it('returns response on success', async () => {
      const responseBody = { message: 'Login successful' };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await AccountService.loginAccount('mypassword');
      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/account/login`, {
        method: 'POST',
        headers: expectedHeaders,
        body: JSON.stringify({ password: 'mypassword' }),
      });
    });

    it('throws parsed API error for invalid password (401)', async () => {
      const errorBody = mockJsonErrorBody('Invalid password');
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(errorBody, false, 401));

      await expect(AccountService.loginAccount('wrongpass')).rejects.toThrow(
        'Invalid password',
      );
    });

    it('throws parsed API error when no account (404)', async () => {
      const errorBody = mockJsonErrorBody('Account not found');
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(errorBody, false, 404));

      await expect(AccountService.loginAccount('password')).rejects.toThrow(
        'Account not found',
      );
    });

    it('throws fallback message when body has no error field', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(AccountService.loginAccount('password')).rejects.toThrow(
        'Failed to login',
      );
    });
  });
});
