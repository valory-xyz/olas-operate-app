const githubOptions = {
  releaseType: 'draft',
  publishAutoUpdate: true,
  token: process.env.GH_TOKEN,
  provider: 'github',
  owner: 'valory-xyz',
  repo: 'olas-operate-app',
  private: false,
  protocol: 'https',
  channel: 'latest',
};

module.exports = { githubOptions };
