import { Octokit } from '@octokit/core';

const octokit = new Octokit({
  auth: process.env.NEXT_PUBLIC_GITHUB_AUTH_TOKEN,
});

type Tag = { name: string };

export const getLatestEaRelease = async () => {
  try {
    const tags = await octokit.request(
      'GET /repos/valory-xyz/olas-operate-app/tags',
      {
        headers: { 'X-GitHub-Api-Version': '2022-11-28' },
      },
    );

    const allTags: Tag[] = tags.data;

    // Find the latest tag that ends with `-all`
    const latestTag = allTags.find((item: Tag) => item.name.endsWith(`-all`));
    if (!latestTag) return null;

    return latestTag.name;
  } catch (error) {
    console.error(error);
    return null;
  }
};
