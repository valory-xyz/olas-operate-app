/**
 * OnlineStatusProvider mock factory for use inside jest.mock factories.
 *
 * Usage:
 * ```
 * jest.mock('../../context/OnlineStatusProvider', () =>
 *   require('../mocks/onlineStatus').onlineStatusProviderMock,
 * );
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createContext } = require('react');

export const onlineStatusProviderMock = {
  OnlineStatusContext: createContext({ isOnline: true }),
};
