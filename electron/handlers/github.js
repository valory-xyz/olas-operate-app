require('dotenv').config();

const { ipcMain } = require('electron');
const { logger } = require('../logger');

const EA_RELEASE_TAG_SUFFIX = '-all';

function registerGithubIpcHandlers() {
  logger.electron('Registering GitHub IPC handlers...');

  ipcMain.handle('get-github-release-tags', async () => {
    try {
      logger.electron(
        `Fetching GitHub data... ${JSON.stringify({
          ghToken: process.env.GITHUB_PAT?.slice(0, 20),
          isEaRelease: process.env.IS_EA,
          isEaReleaseNext: process.env.NEXT_PUBLIC_IS_EA,
          modeRpc: process.env.MODE_RPC,
          nodeEnv: process.env.NODE_ENV,
        })}
        `,
      );

      const { Octokit } = await import('@octokit/core');
      const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
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

      logger.electron(
        `GitHub data fetched successfully ${JSON.stringify({
          tags: allTags,
          latestEaVersion: latestTag.name,
        })}`,
      );

      return {
        tags,
        latestEaVersion: latestTag?.name || null,
        isEaRelease: process.env.IS_EA,
        nodeEnv: process.env.NODE_ENV,
      };
    } catch (error) {
      logger.electron(`Error fetching GitHub data: ${JSON.stringify(error)}`);
      console.error('Error fetching GitHub data:', error);
      return { error: error?.message };
    }
  });
}

module.exports = { registerGithubIpcHandlers };
