/**
 * This script is used to build the electron app **without** notarization. 
 * 
 * This is useful for testing the build process.
 * It will not notarize the app, so it will not be able to be run on someone else's Mac without disabling Gatekeeper on their machine.
 */
import { build } from 'electron-builder';
import { config } from 'dotenv';
config();

const main = async () => {
  console.log('Building...');

  /** @type import {CliOptions} from "electron-builder" */
  await build({
    publish: 'onTag',
    config: {
      appId: 'xyz.valory.olas-operate-app',
      artifactName: '${productName}-${version}-${platform}-${arch}.${ext}',
      productName: 'Pearl',
      files: ['./electron/**/*', './package.json', './dev-app-update.yml'],
      directories: {
        output: './dist',
      },
      extraResources: [
        {
          from: './electron/bins',
          to: 'bins',
          filter: ['**/*'],
        },
      ],
      //   NOTE - Edit this for your own platform, or leave it commented for default settings
      //   mac: {
      //   publish: null,
      //   target: [
      //     {
      //       target: 'default',
      //       arch: ['arm64'],
      //     },
      //   ],
      //   category: 'public.app-category.utilities',
      //   icon: 'electron/assets/icons/splash-robot-head-dock.png',
      //   hardenedRuntime: true,
      //   gatekeeperAssess: false,
      //   entitlements: 'electron/entitlements.mac.plist',
      //   entitlementsInherit: 'electron/entitlements.mac.plist',
      // },
    },
  });
};

main().then((response) => { console.log('Build & Notarize complete'); }).catch((e) => console.error(e));
