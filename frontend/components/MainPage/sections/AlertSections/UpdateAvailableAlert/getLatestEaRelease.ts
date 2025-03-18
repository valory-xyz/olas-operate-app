import { Octokit } from '@octokit/core';

const octokit = new Octokit({
  auth: process.env.NEXT_PUBLIC_GITHUB_AUTH_TOKEN,
});

type Release = { name: string };
type Tag = { name: string };

export async function getLatestEaRelease() {
  try {
    const tags = await octokit.request(
      'GET /repos/valory-xyz/olas-operate-app/tags',
      {
        headers: { 'X-GitHub-Api-Version': '2022-11-28' },
      },
    );

    const releases = await octokit.request(
      'GET /repos/valory-xyz/olas-operate-app/releases',
      {
        headers: { 'X-GitHub-Api-Version': '2022-11-28' },
      },
    );

    const allTags: Tag[] = tags.data;

    // Find the latest tag that ends with `-all`
    const latestTag = allTags.find((item: Tag) => item.name.endsWith(`-all`));
    if (!latestTag) return null;

    // Extract the release version from the tag
    const release = latestTag.name.match(/\d+\.\d+\.\d+-rc\d+/);
    if (!release) return null;

    // Find needed release in the list of releases
    const response = releases.data.find(
      (item: Release) => item.name === release[0],
    );

    console.log({ response, release, latestTag, tags, releases });

    return '0.2.0-rc245-all';
    // return response;
  } catch (error) {
    console.error(error);
    return null;
  }
}
