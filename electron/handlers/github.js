require('dotenv').config();

const { ipcMain } = require('electron');
const { logger } = require('../logger');

function registerGithubIpcHandlers() {
  logger.electron('Registering GitHub IPC handlers...');

  ipcMain.handle('get-latest-ea-release-tag', async () => {
    try {
      const { Octokit } = await import('@octokit/core');
      const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
      const tags = await octokit.request(
        'GET /repos/valory-xyz/olas-operate-app/tags',
        {
          headers: { 'X-GitHub-Api-Version': '2022-11-28' },
        },
      );

      const allTags = tags.data || [];
      const latestEaTag = allTags.find((tag) => tag.name.endsWith('-all'));

      if (!latestEaTag) {
        logger.electron('No EA tag found in GitHub releases');
        return null;
      }

      logger.electron(`The latest EA tag is ${latestEaTag.name}`);
      return latestEaTag.name;
    } catch (error) {
      logger.electron(
        `Error fetching GitHub latest EA tag: ${JSON.stringify(error)}`,
      );
      return null;
    }
  });
}

module.exports = { registerGithubIpcHandlers };
