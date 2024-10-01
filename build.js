//@ts-check
/**
 * This script is used to build the electron app **with notarization**. It is used for the final build and release process.
 */
require('dotenv').config();
const build = require('electron-builder').build;
const { githubPublishOptions } = require('./electron/constants/config');

/**
 * Get the artifact name for the build based on the environment.
 * @returns {string}
 */
function artifactName() {
    const env = process.env.NODE_ENV;
    const prefix = env === 'production' ? '' : 'dev-';
    return prefix + '${productName}-${version}-${platform}-${arch}.${ext}';
}

const main = async () => {
  console.log('Building...');

  /** @type {import('electron-builder').CliOptions}  */
  const cliOptions = {
    publish: 'onTag',
    config: {
      appId: 'xyz.valory.olas-operate-app',
      artifactName: artifactName(),
      productName: 'Pearl',
      files: ['electron/**/*', 'package.json'],
      detectUpdateChannel: false,
      directories: {
        output: 'dist',
      },
      extraResources: [
        {
          from: 'electron/bins',
          to: 'bins',
          filter: ['**/*'],
        },
        {
          from: '.env',
          to: '.env'
        },
      ],
      cscKeyPassword: process.env.CSC_KEY_PASSWORD,
      cscLink: process.env.CSC_LINK,
      mac: {
        
        target: [
          {
            target: 'default', // builds both dmg and zip, required for auto-updates
            arch: ['arm64', 'x64'],            
          },
        ],
        publish: githubPublishOptions,
        category: 'public.app-category.utilities',
        icon: 'electron/assets/icons/splash-robot-head-dock.png',
        hardenedRuntime: true,
        gatekeeperAssess: false,
        entitlements: 'electron/entitlements.mac.plist',
        entitlementsInherit: 'electron/entitlements.mac.plist',
        notarize: {
          teamId: `${process.env.APPLETEAMID}`,
        },
      },
    },
  };

  await build(cliOptions);
};

main().then((response) => { console.log('Build & Notarize complete'); }).catch((e) => console.error(e));
