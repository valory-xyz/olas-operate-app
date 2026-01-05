import { SERVICE_TEMPLATES } from '../../frontend/constants/serviceTemplates';

let hasErrors = false;

function logError(msg: string) {
  console.error(msg);
  hasErrors = true;
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkServiceTemplates(): Promise<void> {
  for (const template of SERVICE_TEMPLATES) {
    console.log(''); // Empty line for separation

    const { agent_release, hash, service_version, name } = template;
    const { owner, name: repoName, version } = agent_release.repository;

    console.log(`Checking template: ${name}`);

    // Check 1: service_version should equal agent_release.version
    if (service_version !== version) {
      logError(`❌ Version mismatch for ${name}: service_version ${service_version} != agent_release.version ${version}`);
    } else {
      console.log(`✅ Version match: ${service_version}`);
    }

    // Check 2: GitHub release files
    const releaseUrls = [
      `https://github.com/${owner}/${repoName}/releases/download/${version}/agent_runner_macos_arm64`,
      `https://github.com/${owner}/${repoName}/releases/download/${version}/agent_runner_macos_x64`,
      `https://github.com/${owner}/${repoName}/releases/download/${version}/agent_runner_windows_x64.exe`,
    ];

    for (const url of releaseUrls) {
      const accessible = await checkUrl(url);
      if (!accessible) {
        logError(`❌ Release file not accessible: ${url}`);
      } else {
        console.log(`✅ Release file accessible: ${url.split('/').pop()}`);
      }
    }

    // Check 3: packages.json and service.yaml
    const packagesUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/refs/tags/${version}/packages/packages.json`;
    const packagesUrlOlasSdk = `https://raw.githubusercontent.com/${owner}/${repoName}/refs/tags/${version}/olas-sdk-starter/packages/packages.json`;
    try {
      let packagesResponse = await fetch(packagesUrl);
      if (!packagesResponse.ok) {
        packagesResponse = await fetch(packagesUrlOlasSdk);
        if (!packagesResponse.ok) {
          logError(`❌ Cannot fetch packages.json: ${packagesUrl}`);
          logError(`❌ Cannot fetch packages.json: ${packagesUrlOlasSdk}`);
          continue;
        }
      }
      const packages = await packagesResponse.json();
      const devPackages = packages.dev;

      let strippedKey: string | null = null;
      for (const [key, value] of Object.entries(devPackages)) {
        if (value === hash) {
          strippedKey = key.replace(/^service\//, '').split('/')[1];
          break;
        }
      }

      if (!strippedKey) {
        logError(`❌ Hash ${hash} not found in packages.json dev`);
        continue;
      }

      const serviceYamlUrl = `https://gateway.autonolas.tech/ipfs/${hash}/${strippedKey}/service.yaml`;
      const yamlAccessible = await checkUrl(serviceYamlUrl);
      if (!yamlAccessible) {
        logError(`❌ Service YAML not accessible: ${serviceYamlUrl}`);
      } else {
        console.log(`✅ Service YAML accessible: ${strippedKey}/service.yaml`);
      }
    } catch (error) {
      logError(`❌ Error fetching packages.json: ${error}`);
    }
  }
}

checkServiceTemplates().then(() => {
  if (hasErrors) process.exit(1);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});