require('dotenv').config();

const { ipcMain } = require('electron');
const { logger } = require('../logger');

function registerGithubIpcHandlers() {
  logger.electron('Registering GitHub IPC handlers...');

  ipcMain.handle('get-github-release-tags', async () => {
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

      logger.electron(
        `GitHub releases fetched successfully and the latest EA tag is ${latestEaTag.name}`,
      );

      return latestEaTag;
    } catch (error) {
      logger.electron(
        `Error fetching GitHub latest EA tag: ${JSON.stringify(error)}`,
      );
      throw error;
    }
  });
}

module.exports = { registerGithubIpcHandlers };
