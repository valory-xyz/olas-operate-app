import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL } from '@/constants/urls';
import { parseApiError } from '@/utils/error';

/**
 * Gets account status "is_setup"
 */
const getAccount = () =>
  fetch(`${BACKEND_URL}/account`, {
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to get account');
  });

/**
 * Creates a local user account
 */
const createAccount = (password: string) =>
  fetch(`${BACKEND_URL}/account`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ password }),
  }).then((response) =>
    response.ok
      ? response.json()
      : parseApiError(response, 'Failed to create account'),
  );

/**
 * Updates user's password
 */
const updateAccount = (oldPassword: string, newPassword: string) =>
  fetch(`${BACKEND_URL}/account`, {
    method: 'PUT',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
    }),
  }).then((response) =>
    response.ok
      ? response.json()
      : parseApiError(response, 'Failed to update account'),
  );

/**
 * Logs in a user
 */
const loginAccount = (password: string) =>
  fetch(`${BACKEND_URL}/account/login`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ password }),
  }).then((response) =>
    response.ok ? response.json() : parseApiError(response, 'Failed to login'),
  );

export const AccountService = {
  getAccount,
  createAccount,
  updateAccount,
  loginAccount,
};
