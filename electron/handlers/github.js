const { ipcMain } = require('electron');
const { logger } = require('../logger');

const EA_RELEASE_TAG_SUFFIX = '-all';

function registerGithubIpcHandlers() {
  ipcMain.handle('get-github-release-tags', async () => {
    try {
      logger.electron('Fetching GitHub data...');

      const { Octokit } = await import('@octokit/core');
      const octokit = new Octokit({ auth: process.env.GH_TOKEN });
      const tags = await octokit.request(
        'GET /repos/valory-xyz/olas-operate-app/tags',
        {
          headers: { 'X-GitHub-Api-Version': '2022-11-28' },
        },
      );

      const allTags = tags.data || [];
      const latestTag = allTags.find((tag) =>
        tag.name.endsWith(EA_RELEASE_TAG_SUFFIX),
      );

      logger.electron('GitHub data fetched successfully', {
        tags: allTags,
        latestEaVersion: latestTag.name,
      });

      return {
        tags,
        latestEaVersion: latestTag?.name || null,
        isEaRelease: process.env.IS_EA,
        firstFewCharsOfToken: process.env.GH_TOKEN?.slice(0, 20),
        nodeEnv: process.env.NODE_ENV,
      };
    } catch (error) {
      logger.electron('Error fetching GitHub data:', error);
      console.error('Error fetching GitHub data:', error);
      return { error: error?.message };
    }
  });
}

module.exports = { registerGithubIpcHandlers };
