/**
 * This script is used to build the electron app **without** notarization. 
 * 
 * This is useful for testing the build process.
 * It will not notarize the app, so it will not be able to be run on someone else's Mac without disabling Gatekeeper on their machine.
 */
require('dotenv').config();
const build = require('electron-builder').build;

const { publishOptions } = require('./electron/constants');

const main = async () => {
  console.log('Building...');

  /** @type import {CliOptions} from "electron-builder" */
  await build({
    publish: 'onTag',
    config: {
      appId: 'xyz.valory.olas-operate-app',
      artifactName: '${productName}-${version}-${platform}-${arch}.${ext}',
      productName: 'Pearl',
      files: ['electron/**/*', 'package.json'],
      directories: {
        output: 'dist',
      },
      extraResources: [
        {
          from: 'electron/bins',
          to: 'bins',
          filter: ['**/*'],
        },
      ],
      mac: {
        publish: null,
        target: [
          {
            target: 'default',
            arch: ['arm64'],
          },
        ],
        category: 'public.app-category.utilities',
        icon: 'electron/assets/icons/splash-robot-head-dock.png',
        hardenedRuntime: true,
        gatekeeperAssess: false,
        entitlements: 'electron/entitlements.mac.plist',
        entitlementsInherit: 'electron/entitlements.mac.plist',
        signIgnore: [
          '.*/_internal/.*',
          '.*/bins/middleware/.*'
        ],
      },
    },
  });
};

main().then(() => {
  console.log('Build & Notarize complete');
});
