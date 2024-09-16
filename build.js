/**
 * This script is used to build the electron app **with notarization**. It is used for the final build and release process.
 */
require('dotenv').config();
const build = require('electron-builder').build;
const fs = require('fs');

const { publishOptions } = require('./electron/constants');

/**
 * Get the artifact name for the build based on the environment.
 * @returns {string}
 */
function artifactName() {
    const env = process.env.NODE_ENV;
    const prefix = env === 'production' ? '' : 'dev-';
    return prefix + '${productName}-${version}-${platform}-${arch}.${ext}';
}

const electronBinsDir = 'electron/bins';

const main = async () => {
  console.log('Building...');

  /** @type import {CliOptions} from "electron-builder" */
  await build({
    publish: 'onTag',
    config: {
      // afterSign: 'electron/hooks/afterSign.js',
      appId: 'xyz.valory.olas-operate-app',
      artifactName: artifactName(),
      productName: 'Pearl',
      files: ['electron/**/*', 'package.json'],
      directories: {
        output: 'dist',
      },      
      extraResources: [
        {
          from: electronBinsDir,
          to: 'bins',
          filter: ['**/*'],
        },
        {
          from: '.env',
          to: '.env'
        },
      ],
      asar: true,
      cscKeyPassword: process.env.CSC_KEY_PASSWORD,
      cscLink: process.env.CSC_LINK,
      mac: {
        binaries: (() => {
          // Read all files from the 'electron/bins' directory          
          const binaries = fs.readdirSync(electronBinsDir);
          // Map each file name to the path inside the .app bundle
          return binaries.map(bin => {
            console.log(`Included binary ${bin} for signing.`);
            return `Contents/Resources/bins/${bin}`;
          });
        })(),
        category: 'public.app-category.utilities',
        entitlements: 'electron/entitlements.mac.plist',
        entitlementsInherit: 'electron/entitlements.mac.plist',
        target: [
          {
            target: 'dmg',
            arch: ['arm64', "x64"],
          },
        ],
        publish: publishOptions,
        icon: 'electron/assets/icons/splash-robot-head-dock.png',
        hardenedRuntime: true,
        gatekeeperAssess: false,
        notarize: {
          teamId: process.env.APPLETEAMID,
        },
      },
    },
  });
};

main().then((response) => { console.log('Build & Notarize complete'); }).catch((e) => console.error(e));
