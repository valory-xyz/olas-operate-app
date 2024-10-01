const { isDev } = require('../constants');

require('dotenv').config();

/**
 * Type definition for GitHub update options
 * @note Required as GithubOptions is not exported as a type, only as an interface
 * @typedef {{
 *  provider: 'github',
 *  owner: string,
 *  repo: string,
 *  private: boolean,
 *  publishAutoUpdate: boolean,
 *  channel: string,
 *  vPrefixedTagName: boolean,
 *  protocol: "https" | "http",
 *  token?: string
 * }} PearlGithubUpdateOptions
 *
 */

/**
 * GitHub update options
 * @see https://www.electron.build/auto-update#githuboptions
 * @type {PearlGithubUpdateOptions}
 * @warning `token` is leaked in app-update.yml if defined here,
 * use {githubPublishOptions} instead if you're looking to release the app to GitHub
 */
const githubUpdateOptions = {
  provider: 'github',
  owner: 'valory-xyz',
  repo: 'olas-operate-app',
  private: false, // Only set to true if the repo is private
  publishAutoUpdate: true, // Publishes the update to GitHub
  channel: isDev ? 'dev' : 'latest', // The release channel to check for updates, e.g. 'latest', 'beta', 'alpha'
  vPrefixedTagName: true,
  protocol: 'https',
};

/**
 * GitHub publish options
 * @see https://www.electron.build/auto-update#githuboptions
 * @type {{
 * releaseType: 'draft' | 'prerelease' | 'release',
 * token?: string
 * } & PearlGithubUpdateOptions}
 */
const githubPublishOptions = {
  ...githubUpdateOptions,
  releaseType: 'draft',
  // token: process.env.GH_TOKEN, // Token assigned temporarily during GitHub Actions
};

module.exports = {
  githubUpdateOptions,
  githubPublishOptions,
};
