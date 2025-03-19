const { ipcMain } = require('electron');

const EA_RELEASE_TAG_SUFFIX = '-all';

function registerGithubIpcHandlers() {
  ipcMain.handle('get-github-release-tags', async () => {
    try {
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

      return {
        tags,
        latestEaVersion: latestTag.name,
        isEaRelease: process.env.IS_EA,
        firstFewCharsOfToken: process.env.GH_TOKEN?.slice(0, 20),
        nodeEnv: process.env.NODE_ENV,
      };
    } catch (error) {
      console.error('Error fetching GitHub data:', error);
      throw error;
    }
  });
}

module.exports = { registerGithubIpcHandlers };
